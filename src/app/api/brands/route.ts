import { handle, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { brandSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    return prisma.brand.findMany({
      where: { userId: user.id },
      include: { settings: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const data = brandSchema.parse(await request.json());

    const isFirst = (await prisma.brand.count({ where: { userId: user.id } })) === 0;

    const brand = await prisma.brand.create({
      data: { ...data, userId: user.id, isDefault: isFirst },
    });
    await prisma.brandSettings.create({ data: { brandId: brand.id } });

    return brand;
  });
}
