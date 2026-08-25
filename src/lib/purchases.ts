import { HttpError } from "@/lib/api";
import { calculateInvoice, type CalcResult, type DiscountType, type TaxMode } from "@/lib/calc";
import { prisma } from "@/lib/db";
import { fromDateInputValue } from "@/lib/format";
import type { PurchaseInput } from "@/lib/schemas";
import { syncPurchaseStock } from "@/lib/stock";
import type { Prisma, Purchase, PurchaseItem } from "@prisma/client";

export type PurchaseWithItems = Purchase & { items: PurchaseItem[] };

export const purchaseInclude = {
  items: { orderBy: { position: "asc" } },
  brand: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.PurchaseInclude;

export function purchaseTotals(input: PurchaseInput): CalcResult {
  return calculateInvoice({
    items: input.items,
    taxMode: input.taxMode as TaxMode,
    taxRate: input.taxRate,
    cgstRate: input.cgstRate,
    sgstRate: input.sgstRate,
    igstRate: input.igstRate,
    discountType: input.discountType as DiscountType,
    discountValue: input.discountValue,
    shippingAmount: input.shippingAmount,
    amountPaid: input.amountPaid,
  });
}

/** Purchase columns from validated input; totals are recomputed server-side. */
function purchaseScalarData(input: PurchaseInput) {
  const totals = purchaseTotals(input);
  return {
    data: {
      billNumber: input.billNumber,
      reference: input.reference,
      status: input.status,
      currency: input.currency,
      billDate: fromDateInputValue(input.billDate) ?? new Date(),
      dueDate: fromDateInputValue(input.dueDate ?? ""),

      supplierName: input.supplierName,
      supplierCompany: input.supplierCompany,
      supplierAddress: input.supplierAddress,
      supplierEmail: input.supplierEmail,
      supplierPhone: input.supplierPhone,
      supplierTaxNumber: input.supplierTaxNumber,
      supplierStateCode: input.supplierStateCode,
      brandStateCode: input.brandStateCode,

      taxMode: input.taxMode,
      taxRate: input.taxRate,
      cgstRate: input.cgstRate,
      sgstRate: input.sgstRate,
      igstRate: input.igstRate,

      discountType: input.discountType,
      discountValue: input.discountValue,

      shippingAmount: input.shippingAmount,
      shippingDescription: input.shippingDescription,

      amountPaid: input.amountPaid,
      notes: input.notes,

      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxableAmount: totals.taxableAmount,
      taxAmount: totals.taxAmount,
      total: totals.total,
      balanceDue: totals.balanceDue,
    },
    totals,
  };
}

function itemRows(input: PurchaseInput, totals: CalcResult) {
  return input.items.map((item, index) => ({
    position: index,
    itemId: item.itemId || null,
    code: item.code,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    taxRate: item.taxRate,
    discountRate: item.discountRate,
    amount: totals.lines[index]?.net ?? 0,
  }));
}

function stockLines(input: PurchaseInput) {
  return input.items.map((item) => ({
    itemId: item.itemId ?? null,
    code: item.code,
    quantity: item.quantity,
    rate: item.rate,
  }));
}

export async function createPurchase(userId: string, input: PurchaseInput) {
  const { data, totals } = purchaseScalarData(input);
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        ...data,
        userId,
        brandId: input.brandId,
        supplierId: input.supplierId || null,
        items: { create: itemRows(input, totals) },
      },
      include: purchaseInclude,
    });

    await syncPurchaseStock(
      tx,
      userId,
      purchase.id,
      purchase.status,
      purchase.billDate,
      stockLines(input),
    );
    return purchase;
  });
}

/** Replaces lines and rewrites the stock ledger, so edits never double-count. */
export async function updatePurchase(userId: string, purchaseId: string, input: PurchaseInput) {
  const { data, totals } = purchaseScalarData(input);
  return prisma.$transaction(async (tx) => {
    await tx.purchaseItem.deleteMany({ where: { purchaseId } });
    const purchase = await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        ...data,
        brandId: input.brandId,
        supplierId: input.supplierId || null,
        items: { create: itemRows(input, totals) },
      },
      include: purchaseInclude,
    });

    await syncPurchaseStock(
      tx,
      userId,
      purchase.id,
      purchase.status,
      purchase.billDate,
      stockLines(input),
    );
    return purchase;
  });
}

/** Referenced brand and supplier must belong to the caller before writing. */
export async function assertPurchaseOwnership(
  userId: string,
  brandId: string,
  supplierId?: string | null,
) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId } });
  if (!brand) throw new HttpError(404, "Brand not found");

  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, userId } });
    if (!supplier) throw new HttpError(404, "Supplier not found");
  }
  return brand;
}

export async function getOwnedPurchase(id: string, userId: string) {
  return prisma.purchase.findFirst({ where: { id, userId }, include: purchaseInclude });
}
