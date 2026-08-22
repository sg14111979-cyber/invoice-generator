import { handle, HttpError, requireApiUser } from "@/lib/api";
import { destroyAllSessions, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminUserUpdateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

async function requireAdminApi(request: Request) {
  const user = await requireApiUser(request);
  if (user.role !== "ADMIN") throw new HttpError(403, "Administrator access required");
  return user;
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const admin = await requireAdminApi(request);
    const { id } = await params;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new HttpError(404, "User not found");

    const data = adminUserUpdateSchema.parse(await request.json());

    if (data.role && data.role !== target.role) {
      // Never leave the instance without an administrator.
      if (target.role === "ADMIN" && data.role === "USER") {
        const admins = await prisma.user.count({ where: { role: "ADMIN" } });
        if (admins <= 1) throw new HttpError(409, "At least one administrator must remain");
      }
      await prisma.user.update({ where: { id }, data: { role: data.role } });
    }

    if (data.password) {
      await prisma.user.update({
        where: { id },
        data: { passwordHash: await hashPassword(data.password) },
      });
      await destroyAllSessions(id);
    }

    return { ok: true, self: admin.id === id };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const admin = await requireAdminApi(request);
    const { id } = await params;
    if (admin.id === id) throw new HttpError(409, "You cannot delete your own account");

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new HttpError(404, "User not found");

    if (target.role === "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) throw new HttpError(409, "At least one administrator must remain");
    }

    await prisma.user.delete({ where: { id } });
    return { ok: true };
  });
}
