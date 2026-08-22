import { calculateInvoice, type CalcResult, type DiscountType, type TaxMode } from "@/lib/calc";
import { joinAddress } from "@/lib/format";

export type TemplateName = "modern" | "corporate" | "classic";

export interface InvoiceViewItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  discountRate: number;
}

/**
 * Everything a rendered invoice needs, independent of storage. The editor builds
 * this from live form state; the PDF route builds it from the database row, so
 * both render identically.
 */
export interface InvoiceView {
  template: TemplateName;
  currency: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  poNumber: string;
  status: string;

  logoPath: string | null;
  fromName: string;
  fromAddress: string;
  fromPhone: string;
  fromEmail: string;
  fromWebsite: string;
  fromTaxNumber: string;
  fromRegistration: string;

  toName: string;
  toCompany: string;
  toAddress: string;
  toEmail: string;
  toPhone: string;
  toTaxNumber: string;

  items: InvoiceViewItem[];

  taxMode: TaxMode;
  taxRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;

  discountType: DiscountType;
  discountValue: number;

  shippingDescription: string;

  notes: string;
  terms: string;
  footer: string;

  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  swift: string;
  upiId: string;
  paymentLink: string;
  paymentInstructions: string;

  totals: CalcResult;
}

export interface InvoiceViewSource
  extends Omit<InvoiceView, "totals" | "template" | "taxMode" | "discountType"> {
  template: string;
  taxMode: string;
  discountType: string;
  shippingAmount: number;
  amountPaid: number;
}

function asTemplate(value: string): TemplateName {
  return value === "corporate" || value === "classic" ? value : "modern";
}

/** Attaches computed totals, so no renderer ever does its own arithmetic. */
export function buildInvoiceView(source: InvoiceViewSource): InvoiceView {
  const taxMode: TaxMode =
    source.taxMode === "NONE" || source.taxMode === "GST" ? source.taxMode : "SINGLE";
  const discountType: DiscountType = source.discountType === "FIXED" ? "FIXED" : "PERCENT";

  const totals = calculateInvoice({
    items: source.items.map((item) => ({
      quantity: item.quantity,
      rate: item.rate,
      taxRate: item.taxRate,
      discountRate: item.discountRate,
    })),
    taxMode,
    taxRate: source.taxRate,
    cgstRate: source.cgstRate,
    sgstRate: source.sgstRate,
    igstRate: source.igstRate,
    discountType,
    discountValue: source.discountValue,
    shippingAmount: source.shippingAmount,
    amountPaid: source.amountPaid,
  });

  return { ...source, template: asTemplate(source.template), taxMode, discountType, totals };
}

export function hasPaymentDetails(view: InvoiceView): boolean {
  return Boolean(
    view.bankName ||
      view.accountName ||
      view.accountNumber ||
      view.ifsc ||
      view.swift ||
      view.upiId ||
      view.paymentLink ||
      view.paymentInstructions,
  );
}

export { joinAddress };
