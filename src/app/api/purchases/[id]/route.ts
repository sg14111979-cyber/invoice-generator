import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertPurchaseOwnership, getOwnedPurchase, updatePurchase } from "@/lib/purchases";
import { purchaseSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    const purchase = await getOwnedPurchase(id, user.id);
    if (!purchase) throw new HttpError(404, "Purchase bill not found");
    return purchase;
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;

    const existing = await prisma.purchase.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Purchase bill not found");

    const input = purchaseSchema.parse(await request.json());
    await assertPurchaseOwnership(user.id, input.brandId, input.supplierId);

    const purchase = await updatePurchase(user.id, id, input);
    return { id: purchase.id, billNumber: purchase.billNumber };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    const existing = await prisma.purchase.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Purchase bill not found");

    // Cascade removes this bill's ledger rows, so stock falls back automatically.
    await prisma.purchase.delete({ where: { id } });
    return { ok: true };
  });
}
