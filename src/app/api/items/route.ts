import { handle, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertCodeFree, itemData, itemSearchWhere } from "@/lib/items";
import { itemSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const query = new URL(request.url).searchParams.get("q") ?? "";

    return prisma.item.findMany({
      where: itemSearchWhere(user.id, query),
      orderBy: [{ code: "asc" }, { name: "asc" }],
      take: 500,
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const data = itemData(itemSchema.parse(await request.json()));
    await assertCodeFree(user.id, data.code);
    return prisma.item.create({ data: { ...data, userId: user.id } });
  });
}
