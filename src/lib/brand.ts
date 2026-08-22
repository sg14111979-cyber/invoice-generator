import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const ACTIVE_BRAND_COOKIE = "ig_brand";

export type BrandWithSettings = NonNullable<Awaited<ReturnType<typeof findBrand>>>;

function findBrand(id: string, userId: string) {
  return prisma.brand.findFirst({
    where: { id, userId },
    include: { settings: true },
  });
}

export async function listBrands(userId: string) {
  return prisma.brand.findMany({
    where: { userId },
    include: { settings: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

/**
 * Resolves the brand the user is currently working under: the cookie choice if
 * it still belongs to them, else their default brand, else the first one.
 */
export async function getActiveBrand(userId: string) {
  const store = await cookies();
  const cookieId = store.get(ACTIVE_BRAND_COOKIE)?.value;

  if (cookieId) {
    const brand = await findBrand(cookieId, userId);
    if (brand) return brand;
  }

  return prisma.brand.findFirst({
    where: { userId },
    include: { settings: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

/** Loads a brand the user owns, or null. Use before any brand-scoped write. */
export async function getOwnedBrand(id: string, userId: string) {
  return findBrand(id, userId);
}
