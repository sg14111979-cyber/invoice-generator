import { handle, HttpError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  return handle(async () => {
    const payload = registerSchema.parse(await request.json());
    const clientKey =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!rateLimit(`register:${clientKey}`, 5, 60 * 60 * 1000)) {
      throw new HttpError(429, "Too many sign-up attempts. Try again later.");
    }

    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) throw new HttpError(409, "An account with that email already exists.");

    const passwordHash = await hashPassword(payload.password);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          passwordHash,
          role: "USER",
        },
      });
      await tx.userSettings.create({ data: { userId: user.id } });

      // Give every new account one editable brand so invoicing works immediately.
      const brand = await tx.brand.create({
        data: { userId: user.id, name: `${payload.name}'s Business`, isDefault: true },
      });
      await tx.brandSettings.create({ data: { brandId: brand.id } });
    });

    return { ok: true };
  });
}
