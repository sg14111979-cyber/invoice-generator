import { calculateInvoice, type DiscountType, type TaxMode } from "@/lib/calc";
import { prisma } from "@/lib/db";
import { fromDateInputValue } from "@/lib/format";
import { buildInvoiceView, type InvoiceView } from "@/lib/invoice-view";
import type { InvoiceInput } from "@/lib/schemas";
import type { Invoice, InvoiceItem, Prisma } from "@prisma/client";

export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

export const invoiceInclude = {
  items: { orderBy: { position: "asc" } },
  brand: { select: { id: true, name: true, logoPath: true } },
  customer: { select: { id: true, name: true } },
} satisfies Prisma.InvoiceInclude;

function totalsFor(input: InvoiceInput) {
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

/**
 * Maps validated editor input onto invoice columns. Totals are always recomputed
 * server-side so a tampered client cannot store a wrong balance.
 */
function invoiceScalarData(input: InvoiceInput, logoPath: string | null) {
  const totals = totalsFor(input);
  return {
    data: {
      invoiceNumber: input.invoiceNumber,
      status: input.status,
      template: input.template,
      currency: input.currency,
      issueDate: fromDateInputValue(input.issueDate) ?? new Date(),
      dueDate: fromDateInputValue(input.dueDate ?? ""),
      paymentTerms: input.paymentTerms,
      poNumber: input.poNumber,

      fromName: input.fromName,
      fromAddress: input.fromAddress,
      fromPhone: input.fromPhone,
      fromEmail: input.fromEmail,
      fromWebsite: input.fromWebsite,
      fromTaxNumber: input.fromTaxNumber,
      fromRegistration: input.fromRegistration,
      fromLogoPath: logoPath,

      toName: input.toName,
      toCompany: input.toCompany,
      toAddress: input.toAddress,
      toEmail: input.toEmail,
      toPhone: input.toPhone,
      toTaxNumber: input.toTaxNumber,

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
      terms: input.terms,
      footer: input.footer,

      bankName: input.bankName,
      accountName: input.accountName,
      accountNumber: input.accountNumber,
      ifsc: input.ifsc,
      swift: input.swift,
      upiId: input.upiId,
      paymentLink: input.paymentLink,
      paymentInstructions: input.paymentInstructions,

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

function itemRows(input: InvoiceInput, totals: ReturnType<typeof totalsFor>) {
  return input.items.map((item, index) => ({
    position: index,
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

export async function createInvoice(userId: string, input: InvoiceInput, logoPath: string | null) {
  const { data, totals } = invoiceScalarData(input, logoPath);
  return prisma.invoice.create({
    data: {
      ...data,
      userId,
      brandId: input.brandId,
      customerId: input.customerId || null,
      items: { create: itemRows(input, totals) },
    },
    include: invoiceInclude,
  });
}

/** Replaces the item list wholesale: simplest correct behaviour for a form save. */
export async function updateInvoice(
  invoiceId: string,
  input: InvoiceInput,
  logoPath: string | null,
) {
  const { data, totals } = invoiceScalarData(input, logoPath);
  return prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        ...data,
        brandId: input.brandId,
        customerId: input.customerId || null,
        items: { create: itemRows(input, totals) },
      },
      include: invoiceInclude,
    });
  });
}

/** Rebuilds a renderable view from stored columns, recomputing totals. */
export function invoiceToView(invoice: InvoiceWithItems): InvoiceView {
  return buildInvoiceView({
    template: invoice.template,
    currency: invoice.currency,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : "",
    paymentTerms: invoice.paymentTerms,
    poNumber: invoice.poNumber,
    status: invoice.status,

    logoPath: invoice.fromLogoPath,
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

    items: invoice.items.map((item) => ({
      code: item.code,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      taxRate: item.taxRate,
      discountRate: item.discountRate,
    })),

    taxMode: invoice.taxMode,
    taxRate: invoice.taxRate,
    cgstRate: invoice.cgstRate,
    sgstRate: invoice.sgstRate,
    igstRate: invoice.igstRate,

    discountType: invoice.discountType,
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
  });
}

/**
 * Flips sent/partially paid invoices past their due date to OVERDUE. Called from
 * the list and dashboard reads so statuses stay truthful without a cron job.
 */
export async function markOverdueInvoices(userId: string): Promise<void> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  await prisma.invoice.updateMany({
    where: {
      userId,
      status: { in: ["SENT", "PARTIALLY_PAID"] },
      dueDate: { lt: startOfToday },
      balanceDue: { gt: 0 },
    },
    data: { status: "OVERDUE" },
  });
}

export async function getOwnedInvoice(id: string, userId: string) {
  return prisma.invoice.findFirst({ where: { id, userId }, include: invoiceInclude });
}
