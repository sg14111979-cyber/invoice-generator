import { handle, HttpError } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setupSchema } from "@/lib/schemas";

/**
 * First-run wizard: creates the owner account (and its first brand) when the
 * database is still empty, then signs the owner in. Refuses once any user exists.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      throw new HttpError(409, "This app is already set up. Please sign in instead.");
    }

    const payload = setupSchema.parse(await request.json());
    const passwordHash = await hashPassword(payload.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          passwordHash,
          role: "ADMIN",
        },
      });
      await tx.userSettings.create({
        data: { userId: created.id, defaultCurrency: payload.currency },
      });

      const brand = await tx.brand.create({
        data: {
          userId: created.id,
          name: payload.businessName,
          email: payload.email,
          isDefault: true,
        },
      });
      await tx.brandSettings.create({
        data: { brandId: brand.id, currency: payload.currency },
      });

      return created;
    });

    await createSession(user.id, true);
    return { ok: true };
  });
}
