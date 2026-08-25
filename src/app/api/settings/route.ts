import { handle, HttpError, requireApiUser } from "@/lib/api";
import { hashPassword, destroyAllSessions, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { changePasswordSchema, profileSchema, userSettingsSchema } from "@/lib/schemas";

/**
 * Single settings endpoint keyed by section, so the tabbed settings UI has one
 * place to talk to.
 */
export async function PATCH(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const body = (await request.json()) as { section?: string; values?: unknown };

    if (body.section === "profile") {
      const data = profileSchema.parse(body.values);
      const clash = await prisma.user.findFirst({
        where: { email: data.email, id: { not: user.id } },
        select: { id: true },
      });
      if (clash) throw new HttpError(409, "That email is already in use");
      await prisma.user.update({ where: { id: user.id }, data });
      return { ok: true };
    }

    if (body.section === "password") {
      const data = changePasswordSchema.parse(body.values);
      const record = await prisma.user.findUnique({ where: { id: user.id } });
      if (!record) throw new HttpError(404, "User not found");

      const valid = await verifyPassword(data.currentPassword, record.passwordHash);
      if (!valid) throw new HttpError(400, "Current password is incorrect");

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(data.newPassword) },
      });
      // Force a fresh sign-in everywhere after a password change.
      await destroyAllSessions(user.id);
      return { ok: true, signedOut: true };
    }

    if (body.section === "preferences") {
      const data = userSettingsSchema.parse(body.values);
      await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: data,
        create: { ...data, userId: user.id },
      });
      return { ok: true };
    }

    throw new HttpError(400, "Unknown settings section");
  });
}
