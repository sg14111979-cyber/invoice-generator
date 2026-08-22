/**
 * Single source of truth for invoice arithmetic. The live preview, the persisted
 * totals and the PDF all run through these helpers so they can never disagree.
 */

export type TaxMode = "NONE" | "SINGLE" | "GST";
export type DiscountType = "PERCENT" | "FIXED";

export interface CalcItem {
  quantity: number;
  rate: number;
  taxRate: number;
  discountRate: number;
}

export interface CalcInput {
  items: CalcItem[];
  taxMode: TaxMode;
  taxRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  discountType: DiscountType;
  discountValue: number;
  shippingAmount: number;
  amountPaid: number;
}

export interface CalcLine {
  gross: number;
  discountAmount: number;
  net: number;
  taxAmount: number;
  amount: number;
}

export interface CalcResult {
  lines: CalcLine[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  shippingAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

/** Rounds to 2 decimals, avoiding binary float artefacts like 0.145 -> 0.14. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateInvoice(input: CalcInput): CalcResult {
  const discountType: DiscountType = input.discountType === "FIXED" ? "FIXED" : "PERCENT";
  const taxMode: TaxMode =
    input.taxMode === "NONE" || input.taxMode === "GST" ? input.taxMode : "SINGLE";

  const lines: CalcLine[] = input.items.map((item) => {
    const gross = round2(num(item.quantity) * num(item.rate));
    const discountAmount = round2((gross * num(item.discountRate)) / 100);
    const net = round2(gross - discountAmount);
    return { gross, discountAmount, net, taxAmount: 0, amount: net };
  });

  const subtotal = round2(lines.reduce((sum, line) => sum + line.net, 0));

  const invoiceDiscount =
    discountType === "PERCENT"
      ? round2((subtotal * num(input.discountValue)) / 100)
      : round2(Math.min(num(input.discountValue), subtotal));

  // Spread the invoice-level discount across lines so per-line tax stays correct.
  const discountFactor = subtotal > 0 ? (subtotal - invoiceDiscount) / subtotal : 0;
  const taxableAmount = round2(subtotal - invoiceDiscount);

  let taxAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxMode === "SINGLE") {
    // Per-line rate when set, else the invoice default rate.
    lines.forEach((line, index) => {
      const rate = num(input.items[index]?.taxRate) || num(input.taxRate);
      const base = round2(line.net * discountFactor);
      const lineTax = round2((base * rate) / 100);
      line.taxAmount = lineTax;
      taxAmount = round2(taxAmount + lineTax);
    });
  } else if (taxMode === "GST") {
    cgstAmount = round2((taxableAmount * num(input.cgstRate)) / 100);
    sgstAmount = round2((taxableAmount * num(input.sgstRate)) / 100);
    igstAmount = round2((taxableAmount * num(input.igstRate)) / 100);
    taxAmount = round2(cgstAmount + sgstAmount + igstAmount);
  }

  const shippingAmount = round2(num(input.shippingAmount));
  const total = round2(taxableAmount + taxAmount + shippingAmount);
  const amountPaid = round2(num(input.amountPaid));

  return {
    lines,
    subtotal,
    discountAmount: invoiceDiscount,
    taxableAmount,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    shippingAmount,
    total,
    amountPaid,
    balanceDue: round2(total - amountPaid),
  };
}
