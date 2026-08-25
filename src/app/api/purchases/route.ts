import { handle, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertPurchaseOwnership, createPurchase } from "@/lib/purchases";
import { purchaseSchema } from "@/lib/schemas";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim() ?? "";

    const where: Prisma.PurchaseWhereInput = {
      userId: user.id,
      ...(params.get("brandId") ? { brandId: params.get("brandId") as string } : {}),
      ...(params.get("status") ? { status: params.get("status") as string } : {}),
      ...(query
        ? {
            OR: [
              { billNumber: { contains: query } },
              { reference: { contains: query } },
              { supplierName: { contains: query } },
              { supplierCompany: { contains: query } },
            ],
          }
        : {}),
    };

    return prisma.purchase.findMany({
      where,
      orderBy: { billDate: "desc" },
      take: 200,
      select: {
        id: true,
        billNumber: true,
        status: true,
        currency: true,
        billDate: true,
        dueDate: true,
        total: true,
        balanceDue: true,
        supplierName: true,
        brand: { select: { id: true, name: true } },
      },
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const input = purchaseSchema.parse(await request.json());
    await assertPurchaseOwnership(user.id, input.brandId, input.supplierId);

    const purchase = await createPurchase(user.id, input);
    return { id: purchase.id, billNumber: purchase.billNumber };
  });
}
