import type { PurchaseBrandOption } from "@/lib/purchase-draft";
import type { PurchaseInput } from "@/lib/schemas";
import type { Brand, BrandSettings } from "@prisma/client";

/** Purchase bills only need the brand's GST identity and tax defaults. */
export function toPurchaseBrandOption(
  brand: Brand & { settings: BrandSettings | null },
): PurchaseBrandOption {
  const settings = brand.settings;
  const taxMode = settings?.gstEnabled ? "GST" : (settings?.taxMode ?? "GST");
  return {
    id: brand.id,
    name: brand.name,
    stateCode: brand.stateCode,
    currency: settings?.currency ?? "INR",
    taxMode: taxMode as PurchaseInput["taxMode"],
    taxRate: settings?.defaultTaxRate ?? 0,
    cgstRate: settings?.cgstRate ?? 0,
    sgstRate: settings?.sgstRate ?? 0,
    igstRate: settings?.igstRate ?? 0,
  };
}
