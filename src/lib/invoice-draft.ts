import { joinAddress, toDateInputValue } from "@/lib/format";
import { buildInvoiceView, type InvoiceView } from "@/lib/invoice-view";
import type { InvoiceWithItems } from "@/lib/invoices";
import type { InvoiceInput } from "@/lib/schemas";
import type { Brand, BrandSettings, Customer, Item } from "@prisma/client";

export type DraftItem = InvoiceInput["items"][number] & { key: string };
export type InvoiceDraft = Omit<InvoiceInput, "items"> & { items: DraftItem[] };

export interface BrandOption {
  id: string;
  name: string;
  logoPath: string | null;
  settings: BrandSettings | null;
  fromName: string;
  fromAddress: string;
  fromPhone: string;
  fromEmail: string;
  fromWebsite: string;
  fromTaxNumber: string;
  fromRegistration: string;
}

export interface ItemOption {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  rate: number;
  taxRate: number;
  hsnCode: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  companyName: string;
  address: string;
  email: string;
  phone: string;
  taxNumber: string;
}

let itemCounter = 0;
export function newItem(): DraftItem {
  itemCounter += 1;
  return {
    key: `item-${Date.now()}-${itemCounter}`,
    code: "",
    description: "",
    quantity: 1,
    unit: "",
    rate: 0,
    taxRate: 0,
    discountRate: 0,
  };
}

export function toBrandOption(brand: Brand & { settings: BrandSettings | null }): BrandOption {
  return {
    id: brand.id,
    name: brand.name,
    logoPath: brand.logoPath,
    settings: brand.settings,
    fromName: brand.name,
    fromAddress: joinAddress([
      brand.addressLine1,
      brand.addressLine2,
      brand.city,
      brand.state,
      brand.postalCode,
      brand.country,
    ]),
    fromPhone: brand.phone,
    fromEmail: brand.email,
    fromWebsite: brand.website,
    fromTaxNumber: brand.taxNumber,
    fromRegistration: brand.registrationNumber,
  };
}

export function toItemOption(item: Item): ItemOption {
  return {
    id: item.id,
    code: item.code ?? "",
    name: item.name,
    description: item.description,
    unit: item.unit,
    rate: item.rate,
    taxRate: item.taxRate,
    hsnCode: item.hsnCode,
  };
}

/** Fills a line from a catalogue entry; the code is snapshotted onto the invoice. */
export function itemToDraftItem(option: ItemOption, current: DraftItem): DraftItem {
  return {
    ...current,
    code: option.code,
    description: option.description || option.name,
    unit: option.unit,
    rate: option.rate,
    taxRate: option.taxRate,
  };
}

export function toCustomerOption(customer: Customer): CustomerOption {
  return {
    id: customer.id,
    name: customer.name,
    companyName: customer.companyName,
    address: joinAddress([
      customer.addressLine1,
      customer.addressLine2,
      customer.city,
      customer.state,
      customer.postalCode,
      customer.country,
    ]),
    email: customer.email,
    phone: customer.phone,
    taxNumber: customer.taxNumber,
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Reads "Net 30" style terms so the due date can default sensibly. */
export function daysFromTerms(terms: string): number {
  const match = /(\d+)/.exec(terms ?? "");
  return match ? Number(match[1]) : 15;
}

export function newInvoiceDraft(brand: BrandOption, invoiceNumber: string): InvoiceDraft {
  const settings = brand.settings;
  const today = new Date();
  const terms = settings?.paymentTerms ?? "Net 15";
  const taxMode = settings?.gstEnabled ? "GST" : (settings?.taxMode ?? "SINGLE");

  return {
    brandId: brand.id,
    customerId: null,
    invoiceNumber,
    status: "DRAFT",
    template: (settings?.template ?? "modern") as InvoiceInput["template"],
    currency: settings?.currency ?? "INR",
    issueDate: toDateInputValue(today),
    dueDate: toDateInputValue(addDays(today, daysFromTerms(terms))),
    paymentTerms: terms,
    poNumber: "",

    fromName: brand.fromName,
    fromAddress: brand.fromAddress,
    fromPhone: brand.fromPhone,
    fromEmail: brand.fromEmail,
    fromWebsite: brand.fromWebsite,
    fromTaxNumber: brand.fromTaxNumber,
    fromRegistration: brand.fromRegistration,

    toName: "",
    toCompany: "",
    toAddress: "",
    toEmail: "",
    toPhone: "",
    toTaxNumber: "",

    taxMode: taxMode as InvoiceInput["taxMode"],
    taxRate: settings?.defaultTaxRate ?? 0,
    cgstRate: settings?.cgstRate ?? 0,
    sgstRate: settings?.sgstRate ?? 0,
    igstRate: settings?.igstRate ?? 0,

    discountType: "PERCENT",
    discountValue: 0,
    shippingAmount: 0,
    shippingDescription: "",
    amountPaid: 0,

    notes: settings?.defaultNotes ?? "",
    terms: settings?.defaultTerms ?? "",
    footer: settings?.defaultFooter ?? "",

    bankName: settings?.bankName ?? "",
    accountName: settings?.accountName ?? "",
    accountNumber: settings?.accountNumber ?? "",
    ifsc: settings?.ifsc ?? "",
    swift: settings?.swift ?? "",
    upiId: settings?.upiId ?? "",
    paymentLink: settings?.paymentLink ?? "",
    paymentInstructions: settings?.paymentInstructions ?? "",

    items: [newItem()],
  };
}

export function draftFromInvoice(invoice: InvoiceWithItems): InvoiceDraft {
  return {
    brandId: invoice.brandId,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status as InvoiceInput["status"],
    template: invoice.template as InvoiceInput["template"],
    currency: invoice.currency,
    issueDate: toDateInputValue(invoice.issueDate),
    dueDate: toDateInputValue(invoice.dueDate),
    paymentTerms: invoice.paymentTerms,
    poNumber: invoice.poNumber,

    fromName: invoice.fromName,
    fromAddress: invoice.fromAddress,
    fromPhone: invoice.fromPhone,
    fromEmail: invoice.fromEmail,
    fromWebsite: invoice.fromWebsite,
    fromTaxNumber: invoice.fromTaxNumber,
    fromRegistration: invoice.fromRegistration,

    toName: invoice.toName,
    toCompany: invoice.toCompany,
    toAddress: invoice.toAddress,
    toEmail: invoice.toEmail,
    toPhone: invoice.toPhone,
    toTaxNumber: invoice.toTaxNumber,

    taxMode: invoice.taxMode as InvoiceInput["taxMode"],
    taxRate: invoice.taxRate,
    cgstRate: invoice.cgstRate,
    sgstRate: invoice.sgstRate,
    igstRate: invoice.igstRate,

    discountType: invoice.discountType as InvoiceInput["discountType"],
    discountValue: invoice.discountValue,
    shippingAmount: invoice.shippingAmount,
    shippingDescription: invoice.shippingDescription,
    amountPaid: invoice.amountPaid,

    notes: invoice.notes,
    terms: invoice.terms,
    footer: invoice.footer,

    bankName: invoice.bankName,
    accountName: invoice.accountName,
    accountNumber: invoice.accountNumber,
    ifsc: invoice.ifsc,
    swift: invoice.swift,
    upiId: invoice.upiId,
    paymentLink: invoice.paymentLink,
    paymentInstructions: invoice.paymentInstructions,

    items:
      invoice.items.length > 0
        ? invoice.items.map((item) => ({
            key: item.id,
            id: item.id,
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

/** Renders live editor state through the shared view model. */
export function draftToView(draft: InvoiceDraft, logoPath: string | null): InvoiceView {
  return buildInvoiceView({
    template: draft.template,
    currency: draft.currency,
    invoiceNumber: draft.invoiceNumber,
    issueDate: draft.issueDate,
    dueDate: draft.dueDate ?? "",
    paymentTerms: draft.paymentTerms,
    poNumber: draft.poNumber,
    status: draft.status,

    logoPath,
    fromName: draft.fromName,
    fromAddress: draft.fromAddress,
    fromPhone: draft.fromPhone,
    fromEmail: draft.fromEmail,
    fromWebsite: draft.fromWebsite,
    fromTaxNumber: draft.fromTaxNumber,
    fromRegistration: draft.fromRegistration,

    toName: draft.toName,
    toCompany: draft.toCompany,
    toAddress: draft.toAddress,
    toEmail: draft.toEmail,
    toPhone: draft.toPhone,
    toTaxNumber: draft.toTaxNumber,

    items: draft.items.map((item) => ({
      code: item.code,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      taxRate: item.taxRate,
      discountRate: item.discountRate,
    })),

    taxMode: draft.taxMode,
    taxRate: draft.taxRate,
    cgstRate: draft.cgstRate,
    sgstRate: draft.sgstRate,
    igstRate: draft.igstRate,

    discountType: draft.discountType,
    discountValue: draft.discountValue,

    shippingAmount: draft.shippingAmount,
    shippingDescription: draft.shippingDescription,
    amountPaid: draft.amountPaid,

    notes: draft.notes,
    terms: draft.terms,
    footer: draft.footer,

    bankName: draft.bankName,
    accountName: draft.accountName,
    accountNumber: draft.accountNumber,
    ifsc: draft.ifsc,
    swift: draft.swift,
    upiId: draft.upiId,
    paymentLink: draft.paymentLink,
    paymentInstructions: draft.paymentInstructions,
  });
}

/** Strips client-only keys before sending to the API. */
export function draftToPayload(draft: InvoiceDraft): unknown {
  const { items, ...rest } = draft;
  return { ...rest, items: items.map(({ key: _key, ...item }) => item) };
}
