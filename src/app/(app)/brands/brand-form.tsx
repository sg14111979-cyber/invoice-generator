"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/field";
import { api, ApiError, upload } from "@/lib/client";
import { CURRENCY_CODES, CURRENCIES } from "@/lib/currency";

export interface BrandFormValues {
  id?: string;
  name: string;
  logoPath: string | null;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  registrationNumber: string;
}

export interface BrandSettingsValues {
  invoicePrefix: string;
  numberFormat: string;
  nextNumber: number;
  numberPadding: number;
  currency: string;
  taxMode: "NONE" | "SINGLE" | "GST";
  defaultTaxRate: number;
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  paymentTerms: string;
  defaultNotes: string;
  defaultTerms: string;
  defaultFooter: string;
  template: "modern" | "corporate" | "classic";
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  swift: string;
  upiId: string;
  paymentLink: string;
  paymentInstructions: string;
}

const EMPTY_BRAND: BrandFormValues = {
  name: "",
  logoPath: null,
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  phone: "",
  email: "",
  website: "",
  taxNumber: "",
  registrationNumber: "",
};

const EMPTY_SETTINGS: BrandSettingsValues = {
  invoicePrefix: "INV",
  numberFormat: "{PREFIX}-{NUMBER}",
  nextNumber: 1,
  numberPadding: 5,
  currency: "INR",
  taxMode: "SINGLE",
  defaultTaxRate: 0,
  gstEnabled: false,
  cgstRate: 0,
  sgstRate: 0,
  igstRate: 0,
  paymentTerms: "Net 15",
  defaultNotes: "",
  defaultTerms: "",
  defaultFooter: "Thank you for your business.",
  template: "modern",
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifsc: "",
  swift: "",
  upiId: "",
  paymentLink: "",
  paymentInstructions: "",
};

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code as string,
  label: `${code} \u2014 ${CURRENCIES[code].label}`,
}));

export function BrandForm({
  brand,
  settings,
}: {
  brand?: BrandFormValues;
  settings?: BrandSettingsValues;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<BrandFormValues>(brand ?? EMPTY_BRAND);
  const [config, setConfig] = useState<BrandSettingsValues>(settings ?? EMPTY_SETTINGS);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  const brandId = values.id;

  function set<K extends keyof BrandFormValues>(key: K, value: BrandFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setSetting<K extends keyof BrandSettingsValues>(
    key: K,
    value: BrandSettingsValues[K],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  const brandPayload = {
    name: values.name,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    city: values.city,
    state: values.state,
    postalCode: values.postalCode,
    country: values.country,
    phone: values.phone,
    email: values.email,
    website: values.website,
    taxNumber: values.taxNumber,
    registrationNumber: values.registrationNumber,
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (brandId) {
        await api(`/api/brands/${brandId}`, {
          method: "PATCH",
          body: { brand: brandPayload, settings: config },
        });
        setNotice("Brand saved.");
        router.refresh();
      } else {
        const created = await api<{ id: string }>("/api/brands", {
          method: "POST",
          body: brandPayload,
        });
        await api(`/api/brands/${created.id}`, {
          method: "PATCH",
          body: { settings: config },
        });
        router.replace(`/brands/${created.id}`);
        router.refresh();
        return;
      }
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.issues
            ? Object.values(caught.issues).flat().filter(Boolean).join(" ") || caught.message
            : caught.message
          : "Could not save the brand.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function onLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !brandId) return;
    setError("");
    setNotice("");
    try {
      const result = await upload<{ logoPath: string }>(
        `/api/brands/${brandId}/logo`,
        file,
      );
      set("logoPath", result.logoPath);
      setNotice("Logo updated.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not upload the logo.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeLogo() {
    if (!brandId) return;
    setError("");
    try {
      await api(`/api/brands/${brandId}/logo`, { method: "DELETE" });
      set("logoPath", null);
      setNotice("Logo removed.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not remove the logo.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {notice}
        </p>
      ) : null}

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Business details
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Brand / business name"
            value={values.name}
            onChange={(value) => set("name", value)}
            required
            className="sm:col-span-2"
          />
          <TextField
            label="Address line 1"
            value={values.addressLine1}
            onChange={(value) => set("addressLine1", value)}
          />
          <TextField
            label="Address line 2"
            value={values.addressLine2}
            onChange={(value) => set("addressLine2", value)}
          />
          <TextField label="City" value={values.city} onChange={(value) => set("city", value)} />
          <TextField label="State" value={values.state} onChange={(value) => set("state", value)} />
          <TextField
            label="Postal code"
            value={values.postalCode}
            onChange={(value) => set("postalCode", value)}
          />
          <TextField
            label="Country"
            value={values.country}
            onChange={(value) => set("country", value)}
          />
          <TextField label="Phone" value={values.phone} onChange={(value) => set("phone", value)} />
          <TextField
            label="Email"
            type="email"
            value={values.email}
            onChange={(value) => set("email", value)}
          />
          <TextField
            label="Website"
            value={values.website}
            onChange={(value) => set("website", value)}
          />
          <TextField
            label="Tax / GST / VAT number"
            value={values.taxNumber}
            onChange={(value) => set("taxNumber", value)}
          />
          <TextField
            label="Registration number"
            value={values.registrationNumber}
            onChange={(value) => set("registrationNumber", value)}
          />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Logo</h2>
        {brandId ? (
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {values.logoPath ? (
                <Image
                  src={values.logoPath}
                  alt="Brand logo"
                  width={160}
                  height={96}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-xs text-slate-400">No logo</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="block text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-navy-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800"
                onChange={onLogoChange}
              />
              <p className="text-xs text-slate-500">PNG, JPG, WEBP or SVG. Up to 2 MB.</p>
              {values.logoPath ? (
                <button type="button" className="btn-danger" onClick={removeLogo}>
                  Remove logo
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Save the brand first, then upload its logo here.
          </p>
        )}
      </section>

      <section className="card p-5" id="invoice-settings">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Invoice settings
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Invoice prefix"
            value={config.invoicePrefix}
            onChange={(value) => setSetting("invoicePrefix", value)}
          />
          <TextField
            label="Number format"
            value={config.numberFormat}
            onChange={(value) => setSetting("numberFormat", value)}
            hint="Tokens: {PREFIX} {NUMBER} {YEAR} {YY} {MONTH}"
          />
          <NumberField
            label="Next number"
            value={config.nextNumber}
            min={1}
            onChange={(value) => setSetting("nextNumber", Math.max(1, Math.round(value)))}
          />
          <NumberField
            label="Number padding"
            value={config.numberPadding}
            min={1}
            max={10}
            onChange={(value) => setSetting("numberPadding", Math.max(1, Math.round(value)))}
          />
          <SelectField
            label="Default currency"
            value={config.currency}
            onChange={(value) => setSetting("currency", value)}
            options={CURRENCY_OPTIONS}
          />
          <SelectField
            label="Default template"
            value={config.template}
            onChange={(value) => setSetting("template", value)}
            options={[
              { value: "modern", label: "Modern" },
              { value: "corporate", label: "Corporate" },
              { value: "classic", label: "Classic" },
            ]}
          />
          <TextField
            label="Default payment terms"
            value={config.paymentTerms}
            onChange={(value) => setSetting("paymentTerms", value)}
          />
          <TextAreaField
            label="Default notes"
            value={config.defaultNotes}
            onChange={(value) => setSetting("defaultNotes", value)}
          />
          <TextAreaField
            label="Default terms & conditions"
            value={config.defaultTerms}
            onChange={(value) => setSetting("defaultTerms", value)}
          />
          <TextField
            label="Default footer"
            value={config.defaultFooter}
            onChange={(value) => setSetting("defaultFooter", value)}
          />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tax</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Tax mode"
            value={config.taxMode}
            onChange={(value) => setSetting("taxMode", value)}
            options={[
              { value: "NONE", label: "No tax" },
              { value: "SINGLE", label: "Percentage tax" },
              { value: "GST", label: "GST (CGST / SGST / IGST)" },
            ]}
          />
          <NumberField
            label="Default tax rate"
            suffix="%"
            value={config.defaultTaxRate}
            max={100}
            step={0.01}
            onChange={(value) => setSetting("defaultTaxRate", value)}
          />
          <div className="sm:col-span-2">
            <CheckboxField
              label="This brand issues GST invoices"
              checked={config.gstEnabled}
              onChange={(value) => setSetting("gstEnabled", value)}
            />
          </div>
          {config.gstEnabled ? (
            <>
              <NumberField
                label="CGST"
                suffix="%"
                value={config.cgstRate}
                max={100}
                step={0.01}
                onChange={(value) => setSetting("cgstRate", value)}
              />
              <NumberField
                label="SGST"
                suffix="%"
                value={config.sgstRate}
                max={100}
                step={0.01}
                onChange={(value) => setSetting("sgstRate", value)}
              />
              <NumberField
                label="IGST"
                suffix="%"
                value={config.igstRate}
                max={100}
                step={0.01}
                onChange={(value) => setSetting("igstRate", value)}
              />
            </>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Payment information
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Bank name"
            value={config.bankName}
            onChange={(value) => setSetting("bankName", value)}
          />
          <TextField
            label="Account name"
            value={config.accountName}
            onChange={(value) => setSetting("accountName", value)}
          />
          <TextField
            label="Account number"
            value={config.accountNumber}
            onChange={(value) => setSetting("accountNumber", value)}
          />
          <TextField
            label="IFSC"
            value={config.ifsc}
            onChange={(value) => setSetting("ifsc", value)}
          />
          <TextField
            label="SWIFT"
            value={config.swift}
            onChange={(value) => setSetting("swift", value)}
          />
          <TextField
            label="UPI ID"
            value={config.upiId}
            onChange={(value) => setSetting("upiId", value)}
            hint="A payment QR code is added to invoices when this is set."
          />
          <TextField
            label="Payment link"
            value={config.paymentLink}
            onChange={(value) => setSetting("paymentLink", value)}
            className="sm:col-span-2"
          />
          <TextAreaField
            label="Payment instructions"
            value={config.paymentInstructions}
            onChange={(value) => setSetting("paymentInstructions", value)}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving\u2026" : brandId ? "Save changes" : "Create brand"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/brands")}
        >
          Back to brands
        </button>
      </div>
    </form>
  );
}
