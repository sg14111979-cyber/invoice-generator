import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { brandSchema, brandSettingsSchema } from "@/lib/schemas";
import { deleteLogo } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

async function ownedBrand(id: string, userId: string) {
  const brand = await prisma.brand.findFirst({ where: { id, userId } });
  if (!brand) throw new HttpError(404, "Brand not found");
  return brand;
}

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    await ownedBrand(id, user.id);
    return prisma.brand.findUnique({ where: { id }, include: { settings: true } });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    await ownedBrand(id, user.id);

    const body = (await request.json()) as { brand?: unknown; settings?: unknown };

    if (body.brand !== undefined) {
      const data = brandSchema.parse(body.brand);
      await prisma.brand.update({ where: { id }, data });
    }
    if (body.settings !== undefined) {
      const settings = brandSettingsSchema.parse(body.settings);
      await prisma.brandSettings.upsert({
        where: { brandId: id },
        update: settings,
        create: { ...settings, brandId: id },
      });
    }

    return prisma.brand.findUnique({ where: { id }, include: { settings: true } });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    const brand = await ownedBrand(id, user.id);

    const invoiceCount = await prisma.invoice.count({ where: { brandId: id } });
    if (invoiceCount > 0) {
      throw new HttpError(
        409,
        `This brand has ${invoiceCount} invoice(s) and cannot be deleted. Invoice history must stay intact.`,
      );
    }

    await prisma.brand.delete({ where: { id } });
    await deleteLogo(brand.logoPath);

    // Keep exactly one default brand for the account.
    if (brand.isDefault) {
      const next = await prisma.brand.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await prisma.brand.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    return { ok: true };
  });
}
