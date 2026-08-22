import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { previewNextInvoiceNumber } from "@/lib/numbering";

/** Preview-only: the number is reserved when the invoice is actually saved. */
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId") ?? "";

    const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: user.id } });
    if (!brand) throw new HttpError(404, "Brand not found");

    return { invoiceNumber: await previewNextInvoiceNumber(brandId) };
  });
}
