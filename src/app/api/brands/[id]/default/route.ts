import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;

    const brand = await prisma.brand.findFirst({ where: { id, userId: user.id } });
    if (!brand) throw new HttpError(404, "Brand not found");

    await prisma.$transaction([
      prisma.brand.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
      prisma.brand.update({ where: { id }, data: { isDefault: true } }),
    ]);

    return { ok: true };
  });
}
