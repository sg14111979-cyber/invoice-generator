import { prisma } from "@/lib/db";
import { round2 } from "@/lib/calc";
import type { Prisma } from "@prisma/client";

/**
 * Stock is never stored as a mutable counter. Every document owns its ledger
 * rows, which are deleted and rewritten inside the same transaction that saves
 * the document, so on-hand quantities can be recomputed at any time and can
 * never drift after an edit, a re-save or a delete.
 *
 * Drafts and cancelled documents deliberately move nothing: goods have not left
 * or arrived yet.
 */
export const STOCK_NEUTRAL_STATUSES = ["DRAFT", "CANCELLED"];

export interface StockLine {
  itemId?: string | null;
  code: string;
  quantity: number;
  rate: number;
}

interface LedgerLine {
  itemId: string;
  quantity: number;
  unitCost: number;
}

export function movesStock(status: string): boolean {
  return !STOCK_NEUTRAL_STATUSES.includes(status);
}

/**
 * Ties each document line to a catalogue item: the id the editor picked when it
 * is genuinely the user's, otherwise a lookup on the typed code. Lines with no
 * match (free-text one-offs) simply do not touch stock.
 */
async function resolveLines(
  tx: Prisma.TransactionClient,
  userId: string,
  lines: StockLine[],
  direction: 1 | -1,
): Promise<LedgerLine[]> {
  const ids = [...new Set(lines.map((line) => line.itemId).filter((id): id is string => !!id))];
  const codes = [...new Set(lines.map((line) => line.code.trim()).filter(Boolean))];

  const items = await tx.item.findMany({
    where: {
      userId,
      trackStock: true,
      OR: [{ id: { in: ids } }, ...(codes.length > 0 ? [{ code: { in: codes } }] : [])],
    },
    select: { id: true, code: true },
  });

  const byId = new Map(items.map((item) => [item.id, item.id]));
  const byCode = new Map(
    items.filter((item) => item.code).map((item) => [item.code as string, item.id]),
  );

  const ledger: LedgerLine[] = [];
  for (const line of lines) {
    const itemId =
      (line.itemId ? byId.get(line.itemId) : undefined) ?? byCode.get(line.code.trim());
    if (!itemId) continue;
    const quantity = round2(direction * Math.abs(line.quantity));
    if (quantity === 0) continue;
    ledger.push({ itemId, quantity, unitCost: round2(line.rate) });
  }
  return ledger;
}

export async function syncInvoiceStock(
  tx: Prisma.TransactionClient,
  userId: string,
  invoiceId: string,
  status: string,
  occurredAt: Date,
  lines: StockLine[],
): Promise<void> {
  await tx.stockMovement.deleteMany({ where: { invoiceId } });
  if (!movesStock(status)) return;

  const ledger = await resolveLines(tx, userId, lines, -1);
  if (ledger.length === 0) return;

  await tx.stockMovement.createMany({
    data: ledger.map((line) => ({
      userId,
      itemId: line.itemId,
      invoiceId,
      source: "INVOICE",
      quantity: line.quantity,
      unitCost: line.unitCost,
      occurredAt,
    })),
  });
}

export async function syncPurchaseStock(
  tx: Prisma.TransactionClient,
  userId: string,
  purchaseId: string,
  status: string,
  occurredAt: Date,
  lines: StockLine[],
): Promise<void> {
  await tx.stockMovement.deleteMany({ where: { purchaseId } });
  if (!movesStock(status)) return;

  const ledger = await resolveLines(tx, userId, lines, 1);
  if (ledger.length === 0) return;

  await tx.stockMovement.createMany({
    data: ledger.map((line) => ({
      userId,
      itemId: line.itemId,
      purchaseId,
      source: "PURCHASE",
      quantity: line.quantity,
      unitCost: line.unitCost,
      occurredAt,
    })),
  });
}

export interface StockLevel {
  itemId: string;
  code: string;
  name: string;
  unit: string;
  rate: number;
  purchaseRate: number;
  lowStockLevel: number;
  openingStock: number;
  purchasedQty: number;
  soldQty: number;
  adjustedQty: number;
  onHand: number;
  stockValue: number;
  lowStock: boolean;
}

/** Opening stock plus the signed ledger, per item, for the current user only. */
export async function stockLevels(userId: string, query = ""): Promise<StockLevel[]> {
  const trimmed = query.trim();
  const items = await prisma.item.findMany({
    where: {
      userId,
      trackStock: true,
      ...(trimmed
        ? { OR: [{ name: { contains: trimmed } }, { code: { contains: trimmed } }] }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 500,
  });

  const movements = await prisma.stockMovement.groupBy({
    by: ["itemId", "source"],
    where: { userId, itemId: { in: items.map((item) => item.id) } },
    _sum: { quantity: true },
  });

  const totals = new Map<string, { purchased: number; sold: number; adjusted: number }>();
  for (const row of movements) {
    const bucket =
      totals.get(row.itemId) ?? { purchased: 0, sold: 0, adjusted: 0 };
    const quantity = row._sum.quantity ?? 0;
    if (row.source === "PURCHASE") bucket.purchased += quantity;
    else if (row.source === "INVOICE") bucket.sold += quantity;
    else bucket.adjusted += quantity;
    totals.set(row.itemId, bucket);
  }

  return items.map((item) => {
    const bucket = totals.get(item.id) ?? { purchased: 0, sold: 0, adjusted: 0 };
    const onHand = round2(
      item.openingStock + bucket.purchased + bucket.sold + bucket.adjusted,
    );
    const cost = item.purchaseRate || item.rate;
    return {
      itemId: item.id,
      code: item.code ?? "",
      name: item.name,
      unit: item.unit,
      rate: item.rate,
      purchaseRate: item.purchaseRate,
      lowStockLevel: item.lowStockLevel,
      openingStock: item.openingStock,
      purchasedQty: round2(bucket.purchased),
      soldQty: round2(Math.abs(bucket.sold)),
      adjustedQty: round2(bucket.adjusted),
      onHand,
      stockValue: round2(onHand * cost),
      lowStock: item.lowStockLevel > 0 && onHand <= item.lowStockLevel,
    };
  });
}

export interface StockSummary {
  trackedItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockValue: number;
}

export function summariseStock(levels: StockLevel[]): StockSummary {
  return {
    trackedItems: levels.length,
    lowStockCount: levels.filter((level) => level.lowStock).length,
    outOfStockCount: levels.filter((level) => level.onHand <= 0).length,
    stockValue: round2(levels.reduce((sum, level) => sum + level.stockValue, 0)),
  };
}

export interface MovementRow {
  id: string;
  itemName: string;
  itemCode: string;
  source: string;
  quantity: number;
  unitCost: number;
  note: string;
  reference: string;
  occurredAt: Date;
}

export async function recentMovements(
  userId: string,
  itemId: string | null,
  take = 100,
): Promise<MovementRow[]> {
  const rows = await prisma.stockMovement.findMany({
    where: { userId, ...(itemId ? { itemId } : {}) },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      item: { select: { name: true, code: true } },
      invoice: { select: { invoiceNumber: true } },
      purchase: { select: { billNumber: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    itemName: row.item.name,
    itemCode: row.item.code ?? "",
    source: row.source,
    quantity: row.quantity,
    unitCost: row.unitCost,
    note: row.note,
    reference: row.invoice?.invoiceNumber ?? row.purchase?.billNumber ?? "",
    occurredAt: row.occurredAt,
  }));
}
