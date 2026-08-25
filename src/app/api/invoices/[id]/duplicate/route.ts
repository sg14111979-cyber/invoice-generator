import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { invoiceInclude } from "@/lib/invoices";
import { reserveInvoiceNumber } from "@/lib/numbering";

type Params = { params: Promise<{ id: string }> };

/** Copies an invoice as a fresh draft with the next reserved number. */
export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;

    const source = await prisma.invoice.findFirst({
      where: { id, userId: user.id },
      include: invoiceInclude,
    });
    if (!source) throw new HttpError(404, "Invoice not found");

    const invoiceNumber = await reserveInvoiceNumber(user.id, source.brandId);
    const { items, brand: _brand, customer: _customer, ...rest } = source;

    const copy = await prisma.invoice.create({
      data: {
        ...rest,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        invoiceNumber,
        status: "DRAFT",
        amountPaid: 0,
        balanceDue: rest.total,
        issueDate: new Date(),
        items: {
          create: items.map(({ id: _itemId, invoiceId: _invoiceId, ...item }) => item),
        },
      },
    });

    return { id: copy.id, invoiceNumber: copy.invoiceNumber };
  });
}
