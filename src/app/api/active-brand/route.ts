import { cookies } from "next/headers";
import { handle, HttpError, requireApiUser } from "@/lib/api";
import { ACTIVE_BRAND_COOKIE } from "@/lib/brand";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const body = (await request.json()) as { brandId?: unknown };
    const brandId = typeof body.brandId === "string" ? body.brandId : "";

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: user.id },
      select: { id: true },
    });
    if (!brand) throw new HttpError(404, "Brand not found");

    const store = await cookies();
    store.set(ACTIVE_BRAND_COOKIE, brand.id, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return { ok: true };
  });
}
