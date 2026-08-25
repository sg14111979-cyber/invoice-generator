import { handle, HttpError, requireApiUser } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminUserSchema } from "@/lib/schemas";

async function requireAdminApi(request: Request) {
  const user = await requireApiUser(request);
  if (user.role !== "ADMIN") throw new HttpError(403, "Administrator access required");
  return user;
}

export async function GET(request: Request) {
  return handle(async () => {
    await requireAdminApi(request);
    return prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { invoices: true, brands: true } },
      },
    });
  });
}

/** Creates a user with their own default brand, mirroring self-registration. */
export async function POST(request: Request) {
  return handle(async () => {
    await requireAdminApi(request);
    const data = adminUserSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new HttpError(409, "That email is already registered");

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: data.name, email: data.email, passwordHash, role: data.role },
      });
      await tx.userSettings.create({ data: { userId: created.id } });
      const brand = await tx.brand.create({
        data: { userId: created.id, name: data.name, isDefault: true },
      });
      await tx.brandSettings.create({ data: { brandId: brand.id } });
      return created;
    });

    return { id: user.id };
  });
}
