import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { ItemInput } from "@/lib/schemas";
import type { Prisma } from "@prisma/client";

/** Empty codes are stored as NULL so any number of code-less items can coexist. */
export function itemData(input: ItemInput) {
  const code = input.code.trim();
  return { ...input, code: code === "" ? null : code };
}

export function itemSearchWhere(userId: string, query: string): Prisma.ItemWhereInput {
  const term = query.trim();
  if (!term) return { userId };
  return {
    userId,
    OR: [
      { code: { contains: term } },
      { name: { contains: term } },
      { description: { contains: term } },
      { hsnCode: { contains: term } },
    ],
  };
}

/** Codes double as the lookup key on invoices, so a clash must be rejected clearly. */
export async function assertCodeFree(userId: string, code: string | null, exceptId?: string) {
  if (!code) return;
  const existing = await prisma.item.findFirst({
    where: { userId, code, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { name: true },
  });
  if (existing) {
    throw new HttpError(409, `Code ${code} is already used by "${existing.name}"`);
  }
}
