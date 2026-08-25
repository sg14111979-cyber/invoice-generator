import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { supplierSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

async function ownedSupplier(id: string, userId: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id, userId } });
  if (!supplier) throw new HttpError(404, "Supplier not found");
  return supplier;
}

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    return ownedSupplier(id, user.id);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    await ownedSupplier(id, user.id);
    const data = supplierSchema.parse(await request.json());
    return prisma.supplier.update({ where: { id }, data });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    await ownedSupplier(id, user.id);

    // Purchases keep their own supplier snapshot, so bills stay readable.
    await prisma.supplier.delete({ where: { id } });
    return { ok: true };
  });
}
