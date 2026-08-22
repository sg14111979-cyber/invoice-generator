import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currency";

const currencyEnum = z.enum(CURRENCY_CODES as [string, ...string[]]);
const optionalText = (max = 500) => z.string().trim().max(max).default("");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
  next: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password is too long"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
});

export const userSettingsSchema = z.object({
  defaultCurrency: currencyEnum.default("INR"),
  defaultPaymentTerms: optionalText(80),
  defaultNotes: optionalText(2000),
  defaultFooter: optionalText(500),
  paperSize: z.enum(["A4", "Letter"]).default("A4"),
  logoPosition: z.enum(["left", "right"]).default("left"),
  fontSize: z.enum(["compact", "normal", "large"]).default("normal"),
  defaultTemplate: z.enum(["modern", "corporate", "classic"]).default("modern"),
});

export const adminUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(["ADMIN", "USER"]).optional(),
  password: z.union([z.string().min(8).max(200), z.literal("")]).optional(),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(160),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(120),
  state: optionalText(120),
  postalCode: optionalText(40),
  country: optionalText(120),
  phone: optionalText(60),
  email: z.union([z.string().trim().email(), z.literal("")]).default(""),
  website: optionalText(200),
  taxNumber: optionalText(60),
  registrationNumber: optionalText(60),
});

export const brandSettingsSchema = z.object({
  invoicePrefix: z.string().trim().max(20).default("INV"),
  numberFormat: z.string().trim().max(60).default("{PREFIX}-{NUMBER}"),
  nextNumber: z.coerce.number().int().min(1).max(10_000_000).default(1),
  numberPadding: z.coerce.number().int().min(1).max(10).default(5),
  currency: currencyEnum.default("INR"),
  taxMode: z.enum(["NONE", "SINGLE", "GST"]).default("SINGLE"),
  defaultTaxRate: z.coerce.number().min(0).max(100).default(0),
  gstEnabled: z.boolean().default(false),
  cgstRate: z.coerce.number().min(0).max(100).default(0),
  sgstRate: z.coerce.number().min(0).max(100).default(0),
  igstRate: z.coerce.number().min(0).max(100).default(0),
  paymentTerms: optionalText(80),
  defaultNotes: optionalText(2000),
  defaultTerms: optionalText(2000),
  defaultFooter: optionalText(500),
  template: z.enum(["modern", "corporate", "classic"]).default("modern"),
  bankName: optionalText(160),
  accountName: optionalText(160),
  accountNumber: optionalText(60),
  ifsc: optionalText(40),
  swift: optionalText(40),
  upiId: optionalText(120),
  paymentLink: optionalText(300),
  paymentInstructions: optionalText(1000),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(160),
  companyName: optionalText(160),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(120),
  state: optionalText(120),
  country: optionalText(120),
  postalCode: optionalText(40),
  email: z.union([z.string().trim().email(), z.literal("")]).default(""),
  phone: optionalText(60),
  taxNumber: optionalText(60),
});

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: optionalText(500),
  quantity: z.coerce.number().min(0).max(1_000_000).default(1),
  unit: optionalText(40),
  rate: z.coerce.number().min(-1_000_000_000).max(1_000_000_000).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountRate: z.coerce.number().min(0).max(100).default(0),
});

export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export const invoiceSchema = z.object({
  brandId: z.string().min(1, "Select a brand"),
  customerId: z.string().nullable().optional(),
  invoiceNumber: z.string().trim().min(1, "Invoice number is required").max(60),
  status: z.enum(INVOICE_STATUSES).default("DRAFT"),
  template: z.enum(["modern", "corporate", "classic"]).default("modern"),
  currency: currencyEnum.default("INR"),
  issueDate: z.string().min(1),
  dueDate: z.string().nullable().optional(),
  paymentTerms: optionalText(80),
  poNumber: optionalText(80),

  fromName: optionalText(160),
  fromAddress: optionalText(500),
  fromPhone: optionalText(60),
  fromEmail: optionalText(160),
  fromWebsite: optionalText(200),
  fromTaxNumber: optionalText(60),
  fromRegistration: optionalText(60),

  toName: optionalText(160),
  toCompany: optionalText(160),
  toAddress: optionalText(500),
  toEmail: optionalText(160),
  toPhone: optionalText(60),
  toTaxNumber: optionalText(60),

  taxMode: z.enum(["NONE", "SINGLE", "GST"]).default("SINGLE"),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  cgstRate: z.coerce.number().min(0).max(100).default(0),
  sgstRate: z.coerce.number().min(0).max(100).default(0),
  igstRate: z.coerce.number().min(0).max(100).default(0),

  discountType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  discountValue: z.coerce.number().min(0).max(1_000_000_000).default(0),

  shippingAmount: z.coerce.number().min(0).max(1_000_000_000).default(0),
  shippingDescription: optionalText(200),

  amountPaid: z.coerce.number().min(0).max(1_000_000_000).default(0),

  notes: optionalText(4000),
  terms: optionalText(4000),
  footer: optionalText(500),

  bankName: optionalText(160),
  accountName: optionalText(160),
  accountNumber: optionalText(60),
  ifsc: optionalText(40),
  swift: optionalText(40),
  upiId: optionalText(120),
  paymentLink: optionalText(300),
  paymentInstructions: optionalText(1000),

  items: z.array(invoiceItemSchema).max(500).default([]),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type BrandInput = z.infer<typeof brandSchema>;
export type BrandSettingsInput = z.infer<typeof brandSettingsSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
