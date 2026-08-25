import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertCodeFree, itemData } from "@/lib/items";
import { itemSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

async function ownedItem(id: string, userId: string) {
  const item = await prisma.item.findFirst({ where: { id, userId } });
  if (!item) throw new HttpError(404, "Item not found");
  return item;
}

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    return ownedItem(id, user.id);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    await ownedItem(id, user.id);
    const data = itemData(itemSchema.parse(await request.json()));
    await assertCodeFree(user.id, data.code, id);
    return prisma.item.update({ where: { id }, data });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    await ownedItem(id, user.id);

    // Invoice lines keep their own copy of code/description, so history is untouched.
    await prisma.item.delete({ where: { id } });
    return { ok: true };
  });
}
