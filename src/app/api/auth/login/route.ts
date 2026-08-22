import { handle, HttpError } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit, clearRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  return handle(async () => {
    const payload = loginSchema.parse(await request.json());
    const clientKey =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const throttleKey = `login:${clientKey}:${payload.email}`;

    if (!rateLimit(throttleKey, 10, 10 * 60 * 1000)) {
      throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    // Same generic message either way so accounts cannot be enumerated.
    const valid = user ? await verifyPassword(payload.password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new HttpError(401, "Incorrect email or password.");
    }

    clearRateLimit(throttleKey);
    await createSession(user.id, payload.rememberMe);
    return { ok: true };
  });
}
