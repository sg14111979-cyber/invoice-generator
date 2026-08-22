import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedBrand } from "@/lib/brand";
import { BrandForm } from "../brand-form";

export const metadata = { title: "Edit brand | Invoice Studio" };

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/brands/${id}`);
  const brand = await getOwnedBrand(id, user.id);
  if (!brand) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{brand.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Brand profile, logo and invoice defaults.
        </p>
      </div>
      <BrandForm
        brand={{
          id: brand.id,
          name: brand.name,
          logoPath: brand.logoPath,
          addressLine1: brand.addressLine1,
          addressLine2: brand.addressLine2,
          city: brand.city,
          state: brand.state,
          postalCode: brand.postalCode,
          country: brand.country,
          phone: brand.phone,
          email: brand.email,
          website: brand.website,
          taxNumber: brand.taxNumber,
          registrationNumber: brand.registrationNumber,
        }}
        settings={
          brand.settings
            ? {
                invoicePrefix: brand.settings.invoicePrefix,
                numberFormat: brand.settings.numberFormat,
                nextNumber: brand.settings.nextNumber,
                numberPadding: brand.settings.numberPadding,
                currency: brand.settings.currency,
                taxMode: brand.settings.taxMode as "NONE" | "SINGLE" | "GST",
                defaultTaxRate: brand.settings.defaultTaxRate,
                gstEnabled: brand.settings.gstEnabled,
                cgstRate: brand.settings.cgstRate,
                sgstRate: brand.settings.sgstRate,
                igstRate: brand.settings.igstRate,
                paymentTerms: brand.settings.paymentTerms,
                defaultNotes: brand.settings.defaultNotes,
                defaultTerms: brand.settings.defaultTerms,
                defaultFooter: brand.settings.defaultFooter,
                template: brand.settings.template as "modern" | "corporate" | "classic",
                bankName: brand.settings.bankName,
                accountName: brand.settings.accountName,
                accountNumber: brand.settings.accountNumber,
                ifsc: brand.settings.ifsc,
                swift: brand.settings.swift,
                upiId: brand.settings.upiId,
                paymentLink: brand.settings.paymentLink,
                paymentInstructions: brand.settings.paymentInstructions,
              }
            : undefined
        }
      />
    </div>
  );
}
