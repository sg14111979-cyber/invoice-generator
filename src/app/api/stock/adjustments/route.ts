import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fromDateInputValue } from "@/lib/format";
import { stockAdjustmentSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const params = new URL(request.url).searchParams;
    const itemId = params.get("itemId");

    return prisma.stockMovement.findMany({
      where: { userId: user.id, ...(itemId ? { itemId } : {}) },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        item: { select: { name: true, code: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        purchase: { select: { id: true, billNumber: true } },
      },
    });
  });
}

/** Manual correction, e.g. after a stock count, breakage or a returned item. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const input = stockAdjustmentSchema.parse(await request.json());

    const item = await prisma.item.findFirst({ where: { id: input.itemId, userId: user.id } });
    if (!item) throw new HttpError(404, "Item not found");

    return prisma.stockMovement.create({
      data: {
        userId: user.id,
        itemId: item.id,
        source: "ADJUSTMENT",
        quantity: input.quantity,
        unitCost: input.unitCost || item.purchaseRate || item.rate,
        note: input.note,
        occurredAt: fromDateInputValue(input.occurredAt ?? "") ?? new Date(),
      },
    });
  });
}
