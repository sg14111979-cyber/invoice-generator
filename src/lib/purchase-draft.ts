import { joinAddress, toDateInputValue } from "@/lib/format";
import { newItem, type DraftItem } from "@/lib/invoice-draft";
import type { PurchaseWithItems } from "@/lib/purchases";
import type { PurchaseInput } from "@/lib/schemas";
import type { Supplier } from "@prisma/client";

export type PurchaseDraft = Omit<PurchaseInput, "items"> & { items: DraftItem[] };

export interface SupplierOption {
  id: string;
  name: string;
  companyName: string;
  address: string;
  email: string;
  phone: string;
  taxNumber: string;
  stateCode: string;
}

export function toSupplierOption(supplier: Supplier): SupplierOption {
  return {
    id: supplier.id,
    name: supplier.name,
    companyName: supplier.companyName,
    address: joinAddress([
      supplier.addressLine1,
      supplier.addressLine2,
      supplier.city,
      supplier.state,
      supplier.postalCode,
      supplier.country,
    ]),
    email: supplier.email,
    phone: supplier.phone,
    taxNumber: supplier.taxNumber,
    stateCode: supplier.stateCode,
  };
}

export interface PurchaseBrandOption {
  id: string;
  name: string;
  stateCode: string;
  currency: string;
  taxMode: PurchaseInput["taxMode"];
  taxRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
}

export function newPurchaseDraft(brand: PurchaseBrandOption): PurchaseDraft {
  return {
    brandId: brand.id,
    supplierId: null,
    billNumber: "",
    reference: "",
    status: "RECEIVED",
    currency: brand.currency,
    billDate: toDateInputValue(new Date()),
    dueDate: "",

    supplierName: "",
    supplierCompany: "",
    supplierAddress: "",
    supplierEmail: "",
    supplierPhone: "",
    supplierTaxNumber: "",
    supplierStateCode: "",
    brandStateCode: brand.stateCode,

    taxMode: brand.taxMode,
    taxRate: brand.taxRate,
    cgstRate: brand.cgstRate,
    sgstRate: brand.sgstRate,
    igstRate: brand.igstRate,

    discountType: "PERCENT",
    discountValue: 0,
    shippingAmount: 0,
    shippingDescription: "",
    amountPaid: 0,
    notes: "",

    items: [newItem()],
  };
}

export function draftFromPurchase(purchase: PurchaseWithItems): PurchaseDraft {
  return {
    brandId: purchase.brandId,
    supplierId: purchase.supplierId,
    billNumber: purchase.billNumber,
    reference: purchase.reference,
    status: purchase.status as PurchaseInput["status"],
    currency: purchase.currency,
    billDate: toDateInputValue(purchase.billDate),
    dueDate: toDateInputValue(purchase.dueDate),

    supplierName: purchase.supplierName,
    supplierCompany: purchase.supplierCompany,
    supplierAddress: purchase.supplierAddress,
    supplierEmail: purchase.supplierEmail,
    supplierPhone: purchase.supplierPhone,
    supplierTaxNumber: purchase.supplierTaxNumber,
    supplierStateCode: purchase.supplierStateCode,
    brandStateCode: purchase.brandStateCode,

    taxMode: purchase.taxMode as PurchaseInput["taxMode"],
    taxRate: purchase.taxRate,
    cgstRate: purchase.cgstRate,
    sgstRate: purchase.sgstRate,
    igstRate: purchase.igstRate,

    discountType: purchase.discountType as PurchaseInput["discountType"],
    discountValue: purchase.discountValue,
    shippingAmount: purchase.shippingAmount,
    shippingDescription: purchase.shippingDescription,
    amountPaid: purchase.amountPaid,
    notes: purchase.notes,

    items:
      purchase.items.length > 0
        ? purchase.items.map((item) => ({
            key: item.id,
            id: item.id,
            itemId: item.itemId,
            code: item.code,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            taxRate: item.taxRate,
            discountRate: item.discountRate,
          }))
        : [newItem()],
  };
}

export function purchaseDraftToPayload(draft: PurchaseDraft): unknown {
  const { items, ...rest } = draft;
  return { ...rest, items: items.map(({ key: _key, ...item }) => item) };
}
