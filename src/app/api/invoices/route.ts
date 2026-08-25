import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createInvoice } from "@/lib/invoices";
import { previewNextInvoiceNumber, reserveInvoiceNumber } from "@/lib/numbering";
import { invoiceSchema } from "@/lib/schemas";
import type { Prisma } from "@prisma/client";

/** Ensures referenced brand/customer belong to the caller before writing. */
async function assertOwnership(userId: string, brandId: string, customerId?: string | null) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId } });
  if (!brand) throw new HttpError(404, "Brand not found");

  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, userId } });
    if (!customer) throw new HttpError(404, "Customer not found");
  }
  return brand;
}

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim() ?? "";

    const where: Prisma.InvoiceWhereInput = {
      userId: user.id,
      ...(params.get("brandId") ? { brandId: params.get("brandId") as string } : {}),
      ...(params.get("status") ? { status: params.get("status") as string } : {}),
      ...(query
        ? {
            OR: [
              { invoiceNumber: { contains: query } },
              { toName: { contains: query } },
              { toCompany: { contains: query } },
              { poNumber: { contains: query } },
            ],
          }
        : {}),
    };

    return prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      take: 200,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        currency: true,
        issueDate: true,
        dueDate: true,
        total: true,
        balanceDue: true,
        toName: true,
        brand: { select: { id: true, name: true } },
      },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const input = invoiceSchema.parse(await request.json());
    const brand = await assertOwnership(user.id, input.brandId, input.customerId);

    // Keeping the auto-suggested number consumes the brand sequence; a manually
    // typed number is used as-is and must be unique.
    const suggested = await previewNextInvoiceNumber(input.brandId);
    if (input.invoiceNumber === suggested) {
      input.invoiceNumber = await reserveInvoiceNumber(user.id, input.brandId);
    } else {
      const duplicate = await prisma.invoice.findFirst({
        where: { userId: user.id, invoiceNumber: input.invoiceNumber },
        select: { id: true },
      });
      if (duplicate) throw new HttpError(409, "An invoice with this number already exists");
    }

    const invoice = await createInvoice(user.id, input, brand.logoPath);
    return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
  });
}
