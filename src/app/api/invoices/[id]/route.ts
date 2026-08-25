import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getOwnedInvoice, updateInvoice } from "@/lib/invoices";
import { invoiceSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    const invoice = await getOwnedInvoice(id, user.id);
    if (!invoice) throw new HttpError(404, "Invoice not found");
    return invoice;
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;

    const existing = await prisma.invoice.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Invoice not found");

    const input = invoiceSchema.parse(await request.json());

    const brand = await prisma.brand.findFirst({ where: { id: input.brandId, userId: user.id } });
    if (!brand) throw new HttpError(404, "Brand not found");
    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, userId: user.id },
      });
      if (!customer) throw new HttpError(404, "Customer not found");
    }

    const clash = await prisma.invoice.findFirst({
      where: { userId: user.id, invoiceNumber: input.invoiceNumber, id: { not: id } },
      select: { id: true },
    });
    if (clash) throw new HttpError(409, "An invoice with this number already exists");

    // Keep the original logo snapshot unless the brand changed.
    const logoPath = existing.brandId === input.brandId ? existing.fromLogoPath : brand.logoPath;
    const invoice = await updateInvoice(user.id, id, input, logoPath);
    return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    const existing = await prisma.invoice.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Invoice not found");

    await prisma.invoice.delete({ where: { id } });
    return { ok: true };
  });
}
