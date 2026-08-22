import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { deleteLogo, saveLogo } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;

    const brand = await prisma.brand.findFirst({ where: { id, userId: user.id } });
    if (!brand) throw new HttpError(404, "Brand not found");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file was uploaded.");

    const logoPath = await saveLogo(file);
    await prisma.brand.update({ where: { id }, data: { logoPath } });
    await deleteLogo(brand.logoPath);

    return { logoPath };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;

    const brand = await prisma.brand.findFirst({ where: { id, userId: user.id } });
    if (!brand) throw new HttpError(404, "Brand not found");

    await prisma.brand.update({ where: { id }, data: { logoPath: null } });
    await deleteLogo(brand.logoPath);

    return { ok: true };
  });
}
