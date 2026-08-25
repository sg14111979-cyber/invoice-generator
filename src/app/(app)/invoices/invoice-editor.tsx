"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InvoicePreview } from "@/components/invoice-preview";
import { NumberField, SelectField, TextAreaField, TextField } from "@/components/field";
import { StateField } from "@/components/state-field";
import { round2 } from "@/lib/calc";
import { CURRENCIES, CURRENCY_CODES, formatMoney } from "@/lib/currency";
import { api, ApiError } from "@/lib/client";
import { toDateInputValue } from "@/lib/format";
import { stateLabel, supplyType, type SupplyType } from "@/lib/states";
import {
  daysFromTerms,
  draftToPayload,
  draftToView,
  itemToDraftItem,
  newItem,
  type BrandOption,
  type CustomerOption,
  type InvoiceDraft,
  type ItemOption,
} from "@/lib/invoice-draft";
import { INVOICE_STATUSES } from "@/lib/schemas";

interface Props {
  brands: BrandOption[];
  customers: CustomerOption[];
  catalog: ItemOption[];
  initialDraft: InvoiceDraft;
  invoiceId: string | null;
}

/** Label used both in the datalist and to match what the user picked back to an item. */
function catalogLabel(option: ItemOption): string {
  return option.code ? `${option.code} \u2014 ${option.name}` : option.name;
}

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code as string,
  label: `${code} \u2014 ${CURRENCIES[code].label}`,
}));

const STATUS_OPTIONS = INVOICE_STATUSES.map((status) => ({
  value: status,
  label: status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" "),
}));

const SAVE_DEBOUNCE_MS = 1500;

export function InvoiceEditor({
  brands,
  customers,
  catalog: initialCatalog,
  initialDraft,
  invoiceId,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<InvoiceDraft>(initialDraft);
  const [catalog, setCatalog] = useState<ItemOption[]>(initialCatalog);
  const [itemNotice, setItemNotice] = useState("");
  const [savedId, setSavedId] = useState<string | null>(invoiceId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  // Autosave bookkeeping: skip the first render and never run two saves at once.
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const savedIdRef = useRef(savedId);
  savedIdRef.current = savedId;

  const activeBrand = useMemo(
    () => brands.find((brand) => brand.id === draft.brandId) ?? brands[0],
    [brands, draft.brandId],
  );

  const view = useMemo(
    () => draftToView(draft, activeBrand?.logoPath ?? null),
    [draft, activeBrand],
  );

  const set = useCallback(<K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) => {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const setItem = useCallback(
    <K extends keyof InvoiceDraft["items"][number]>(
      index: number,
      key: K,
      value: InvoiceDraft["items"][number][K],
    ) => {
      dirtyRef.current = true;
      setDraft((current) => ({
        ...current,
        items: current.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
      }));
    },
    [],
  );

  const save = useCallback(
    async (options: { silent?: boolean } = {}): Promise<string | null> => {
      if (savingRef.current) return savedIdRef.current;
      savingRef.current = true;
      setSaving(true);
      setError("");
      try {
        const payload = draftToPayload(draftRef.current);
        const id = savedIdRef.current;
        const result = id
          ? await api<{ id: string; invoiceNumber: string }>(`/api/invoices/${id}`, {
              method: "PATCH",
              body: payload,
            })
          : await api<{ id: string; invoiceNumber: string }>("/api/invoices", {
              method: "POST",
              body: payload,
            });

        dirtyRef.current = false;
        setSavedId(result.id);
        savedIdRef.current = result.id;
        setDraft((current) => ({ ...current, invoiceNumber: result.invoiceNumber }));
        setSavedAt(new Date().toLocaleTimeString());
        if (!options.silent) router.refresh();
        return result.id;
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "Could not save the invoice");
        return null;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [router],
  );

  // Draft autosave: only for DRAFT invoices, and only once there is real content.
  useEffect(() => {
    if (draft.status !== "DRAFT") return;
    if (!dirtyRef.current) return;
    const hasContent = draft.items.some((item) => item.description.trim() || item.rate !== 0);
    if (!hasContent || !draft.invoiceNumber.trim()) return;

    const timer = setTimeout(() => {
      void save({ silent: true });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, save]);

  function applyBrand(brandId: string) {
    const brand = brands.find((option) => option.id === brandId);
    if (!brand) return;
    const settings = brand.settings;
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      brandId,
      fromName: brand.fromName,
      fromAddress: brand.fromAddress,
      fromPhone: brand.fromPhone,
      fromEmail: brand.fromEmail,
      fromWebsite: brand.fromWebsite,
      fromTaxNumber: brand.fromTaxNumber,
      fromRegistration: brand.fromRegistration,
      fromStateCode: brand.fromStateCode,
      currency: settings?.currency ?? current.currency,
      template: (settings?.template ?? current.template) as InvoiceDraft["template"],
      taxMode: (settings?.gstEnabled
        ? "GST"
        : (settings?.taxMode ?? current.taxMode)) as InvoiceDraft["taxMode"],
      taxRate: settings?.defaultTaxRate ?? current.taxRate,
      cgstRate: settings?.cgstRate ?? current.cgstRate,
      sgstRate: settings?.sgstRate ?? current.sgstRate,
      igstRate: settings?.igstRate ?? current.igstRate,
      bankName: settings?.bankName ?? current.bankName,
      accountName: settings?.accountName ?? current.accountName,
      accountNumber: settings?.accountNumber ?? current.accountNumber,
      ifsc: settings?.ifsc ?? current.ifsc,
      swift: settings?.swift ?? current.swift,
      upiId: settings?.upiId ?? current.upiId,
      paymentLink: settings?.paymentLink ?? current.paymentLink,
      paymentInstructions: settings?.paymentInstructions ?? current.paymentInstructions,
    }));
  }

  function applyCustomer(customerId: string) {
    if (!customerId) {
      dirtyRef.current = true;
      setDraft((current) => ({ ...current, customerId: null }));
      return;
    }
    const customer = customers.find((option) => option.id === customerId);
    if (!customer) return;
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      customerId,
      toName: customer.name,
      toCompany: customer.companyName,
      toAddress: customer.address,
      toEmail: customer.email,
      toPhone: customer.phone,
      toTaxNumber: customer.taxNumber,
      toStateCode: customer.stateCode,
    }));
  }

  function applyTerms(terms: string) {
    dirtyRef.current = true;
    const issue = draft.issueDate ? new Date(`${draft.issueDate}T00:00:00.000Z`) : new Date();
    const due = new Date(issue);
    due.setUTCDate(due.getUTCDate() + daysFromTerms(terms));
    setDraft((current) => ({
      ...current,
      paymentTerms: terms,
      dueDate: toDateInputValue(due),
    }));
  }

  /** Accepts a code, a name or the "CODE \u2014 Name" label the datalist offers. */
  function applyCatalogItem(index: number, typed: string) {
    const needle = typed.trim().toLowerCase();
    if (!needle) return;
    const option = catalog.find(
      (candidate) =>
        catalogLabel(candidate).toLowerCase() === needle ||
        candidate.code.toLowerCase() === needle ||
        candidate.name.toLowerCase() === needle,
    );
    if (!option) return;

    dirtyRef.current = true;
    setItemNotice("");
    setDraft((current) => ({
      ...current,
      items: current.items.map((line, i) => (i === index ? itemToDraftItem(option, line) : line)),
    }));
  }

  async function saveItemToCatalog(index: number) {
    const line = draft.items[index];
    const name = line.description.trim();
    if (!name) {
      setItemNotice("Type a description first, then save it as an item.");
      return;
    }
    setItemNotice("");
    try {
      const saved = await api<ItemOption & { code: string | null }>("/api/items", {
        method: "POST",
        body: {
          code: line.code,
          name,
          description: line.description,
          unit: line.unit,
          rate: line.rate,
          taxRate: line.taxRate,
        },
      });
      setCatalog((current) => [...current, { ...saved, code: saved.code ?? "" }]);
      setItemNotice(`Saved "${name}" to your items.`);
    } catch (caught) {
      setItemNotice(
        caught instanceof ApiError ? caught.message : "Could not save this line as an item.",
      );
    }
  }

  function addItem() {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, items: [...current.items, newItem()] }));
  }

  function duplicateItem(index: number) {
    dirtyRef.current = true;
    setDraft((current) => {
      const items = [...current.items];
      items.splice(index + 1, 0, { ...current.items[index], ...{ key: newItem().key, id: undefined } });
      return { ...current, items };
    });
  }

  function removeItem(index: number) {
    dirtyRef.current = true;
    setDraft((current) => {
      const items = current.items.filter((_, i) => i !== index);
      return { ...current, items: items.length > 0 ? items : [newItem()] };
    });
  }

  const isGst = draft.taxMode === "GST";
  const supply = supplyType(draft.fromStateCode, draft.toStateCode);
  const gstRate = round2(draft.cgstRate + draft.sgstRate + draft.igstRate);
  // Intra-state GST is split in two halves; inter-state is a single IGST rate.
  const gstSplitWrong =
    isGst &&
    gstRate > 0 &&
    ((supply === "INTRA" && draft.igstRate > 0) ||
      (supply === "INTER" && draft.cgstRate + draft.sgstRate > 0));

  function applySupplyType(next: SupplyType) {
    dirtyRef.current = true;
    setDraft((current) => {
      const total = round2(current.cgstRate + current.sgstRate + current.igstRate);
      return next === "INTER"
        ? { ...current, cgstRate: 0, sgstRate: 0, igstRate: total }
        : { ...current, cgstRate: round2(total / 2), sgstRate: round2(total / 2), igstRate: 0 };
    });
  }

  const editor = (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Invoice details</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Brand"
            value={draft.brandId}
            onChange={applyBrand}
            options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          />
          <TextField
            label="Invoice number"
            value={draft.invoiceNumber}
            onChange={(value) => set("invoiceNumber", value)}
            required
          />
          <SelectField
            label="Status"
            value={draft.status}
            onChange={(value) => set("status", value)}
            options={STATUS_OPTIONS}
          />
          <TextField
            label="Invoice date"
            type="date"
            value={draft.issueDate}
            onChange={(value) => set("issueDate", value)}
          />
          <TextField
            label="Due date"
            type="date"
            value={draft.dueDate ?? ""}
            onChange={(value) => set("dueDate", value)}
          />
          <TextField
            label="Payment terms"
            value={draft.paymentTerms}
            onChange={applyTerms}
            placeholder="Net 15"
          />
          <TextField
            label="PO / reference"
            value={draft.poNumber}
            onChange={(value) => set("poNumber", value)}
          />
          <SelectField
            label="Currency"
            value={draft.currency}
            onChange={(value) => set("currency", value)}
            options={CURRENCY_OPTIONS}
          />
          <SelectField
            label="Template"
            value={draft.template}
            onChange={(value) => set("template", value)}
            options={[
              { value: "modern", label: "Modern" },
              { value: "corporate", label: "Corporate" },
              { value: "classic", label: "Classic" },
            ]}
          />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Bill to</h2>
          <Link href="/customers" className="text-xs font-semibold text-navy-700 hover:underline">
            Manage customers
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Customer"
            value={draft.customerId ?? ""}
            onChange={applyCustomer}
            options={[
              { value: "", label: "\u2014 No saved customer \u2014" },
              ...customers.map((customer) => ({
                value: customer.id,
                label: customer.companyName
                  ? `${customer.name} (${customer.companyName})`
                  : customer.name,
              })),
            ]}
          />
          <TextField
            label="Name"
            value={draft.toName}
            onChange={(value) => set("toName", value)}
          />
          <TextField
            label="Company"
            value={draft.toCompany}
            onChange={(value) => set("toCompany", value)}
          />
          <TextField
            label="Email"
            value={draft.toEmail}
            onChange={(value) => set("toEmail", value)}
          />
          <TextField
            label="Phone"
            value={draft.toPhone}
            onChange={(value) => set("toPhone", value)}
          />
          <TextField
            label="Tax number"
            value={draft.toTaxNumber}
            onChange={(value) => set("toTaxNumber", value)}
          />
          <StateField
            label="Place of supply (state code)"
            code={draft.toStateCode}
            gstin={draft.toTaxNumber}
            onChange={(code) => set("toStateCode", code)}
          />
          <TextAreaField
            label="Address"
            value={draft.toAddress}
            onChange={(value) => set("toAddress", value)}
            className="sm:col-span-2"
            rows={2}
          />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
          <Link href="/items" className="text-xs font-semibold text-navy-700 hover:underline">
            Manage items
          </Link>
        </div>
        {itemNotice ? (
          <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {itemNotice}
          </p>
        ) : null}
        <datalist id="catalog-items">
          {catalog.map((option) => (
            <option key={option.id} value={catalogLabel(option)} />
          ))}
        </datalist>
        <div className="mt-3 space-y-3">
          {draft.items.map((item, index) => (
            <div key={item.key} className="rounded-md border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                <label className="col-span-2 block sm:col-span-4">
                  <span className="label">Pick a saved item</span>
                  <input
                    className="input"
                    list="catalog-items"
                    placeholder="Type a code or name, e.g. A4-COPY-80"
                    onChange={(event) => applyCatalogItem(index, event.target.value)}
                  />
                </label>
                <TextField
                  label="Item code"
                  value={item.code}
                  onChange={(value) => setItem(index, "code", value)}
                  className="col-span-2"
                />
                <TextAreaField
                  label="Description"
                  value={item.description}
                  onChange={(value) => setItem(index, "description", value)}
                  rows={2}
                  className="col-span-2 sm:col-span-6"
                />
                <NumberField
                  label="Qty"
                  value={item.quantity}
                  onChange={(value) => setItem(index, "quantity", value)}
                  step={0.01}
                />
                <TextField
                  label="Unit"
                  value={item.unit}
                  onChange={(value) => setItem(index, "unit", value)}
                  placeholder="hrs"
                />
                <NumberField
                  label="Rate"
                  value={item.rate}
                  onChange={(value) => setItem(index, "rate", value)}
                  step={0.01}
                  min={-1_000_000_000}
                />
                {!isGst && draft.taxMode !== "NONE" ? (
                  <NumberField
                    label="Tax %"
                    value={item.taxRate}
                    onChange={(value) => setItem(index, "taxRate", value)}
                    step={0.01}
                    max={100}
                  />
                ) : null}
                <NumberField
                  label="Disc %"
                  value={item.discountRate}
                  onChange={(value) => setItem(index, "discountRate", value)}
                  step={0.01}
                  max={100}
                />
                <div className="flex items-end justify-end text-sm font-semibold text-slate-900">
                  {formatMoney(view.totals.lines[index]?.net ?? 0, draft.currency)}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void saveItemToCatalog(index)}
                >
                  Save as item
                </button>
                <button type="button" className="btn-secondary" onClick={() => duplicateItem(index)}>
                  Duplicate
                </button>
                <button type="button" className="btn-danger" onClick={() => removeItem(index)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary mt-3" onClick={addItem}>
          Add item
        </button>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Tax, discount &amp; shipping</h2>
        {isGst ? (
          <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p>
              Your state{" "}
              <strong>{stateLabel(draft.fromStateCode) || "not set on this brand"}</strong> →
              place of supply{" "}
              <strong>{stateLabel(draft.toStateCode) || "not set"}</strong>
              {supply === "INTRA" ? " · same state, charge CGST + SGST" : null}
              {supply === "INTER" ? " · different states, charge IGST" : null}
            </p>
            {gstSplitWrong ? (
              <button
                type="button"
                className="mt-1 font-semibold text-navy-700 hover:underline"
                onClick={() => applySupplyType(supply === "INTRA" ? "INTRA" : "INTER")}
              >
                {supply === "INTRA"
                  ? `Split ${gstRate}% into CGST + SGST`
                  : `Move ${gstRate}% to IGST`}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Tax mode"
            value={draft.taxMode}
            onChange={(value) => set("taxMode", value)}
            options={[
              { value: "NONE", label: "No tax" },
              { value: "SINGLE", label: "Single / per-item rate" },
              { value: "GST", label: "GST (CGST / SGST / IGST)" },
            ]}
          />
          {draft.taxMode === "SINGLE" ? (
            <NumberField
              label="Default tax rate"
              suffix="%"
              value={draft.taxRate}
              onChange={(value) => set("taxRate", value)}
              step={0.01}
              max={100}
            />
          ) : null}
          {isGst ? (
            <>
              <NumberField
                label="CGST"
                suffix="%"
                value={draft.cgstRate}
                onChange={(value) => set("cgstRate", value)}
                step={0.01}
                max={100}
              />
              <NumberField
                label="SGST"
                suffix="%"
                value={draft.sgstRate}
                onChange={(value) => set("sgstRate", value)}
                step={0.01}
                max={100}
              />
              <NumberField
                label="IGST"
                suffix="%"
                value={draft.igstRate}
                onChange={(value) => set("igstRate", value)}
                step={0.01}
                max={100}
              />
            </>
          ) : null}
          <SelectField
            label="Discount type"
            value={draft.discountType}
            onChange={(value) => set("discountType", value)}
            options={[
              { value: "PERCENT", label: "Percentage" },
              { value: "FIXED", label: "Fixed amount" },
            ]}
          />
          <NumberField
            label="Discount value"
            value={draft.discountValue}
            onChange={(value) => set("discountValue", value)}
            step={0.01}
            max={draft.discountType === "PERCENT" ? 100 : undefined}
          />
          <NumberField
            label="Shipping"
            value={draft.shippingAmount}
            onChange={(value) => set("shippingAmount", value)}
            step={0.01}
          />
          <TextField
            label="Shipping description"
            value={draft.shippingDescription}
            onChange={(value) => set("shippingDescription", value)}
          />
          <NumberField
            label="Amount paid"
            value={draft.amountPaid}
            onChange={(value) => set("amountPaid", value)}
            step={0.01}
          />
        </div>

        <dl className="mt-4 space-y-1 rounded-md bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd>{formatMoney(view.totals.subtotal, draft.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Tax</dt>
            <dd>{formatMoney(view.totals.taxAmount, draft.currency)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-slate-900">
            <dt>Total</dt>
            <dd>{formatMoney(view.totals.total, draft.currency)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-navy-800">
            <dt>Balance due</dt>
            <dd>{formatMoney(view.totals.balanceDue, draft.currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Payment details</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="Bank name"
            value={draft.bankName}
            onChange={(value) => set("bankName", value)}
          />
          <TextField
            label="Account name"
            value={draft.accountName}
            onChange={(value) => set("accountName", value)}
          />
          <TextField
            label="Account number"
            value={draft.accountNumber}
            onChange={(value) => set("accountNumber", value)}
          />
          <TextField label="IFSC" value={draft.ifsc} onChange={(value) => set("ifsc", value)} />
          <TextField label="SWIFT" value={draft.swift} onChange={(value) => set("swift", value)} />
          <TextField label="UPI ID" value={draft.upiId} onChange={(value) => set("upiId", value)} />
          <TextField
            label="Payment link"
            value={draft.paymentLink}
            onChange={(value) => set("paymentLink", value)}
            className="sm:col-span-2"
          />
          <TextAreaField
            label="Payment instructions"
            value={draft.paymentInstructions}
            onChange={(value) => set("paymentInstructions", value)}
            className="sm:col-span-2 lg:col-span-3"
            rows={2}
          />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Business (from)</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Business name"
            value={draft.fromName}
            onChange={(value) => set("fromName", value)}
          />
          <TextField
            label="Email"
            value={draft.fromEmail}
            onChange={(value) => set("fromEmail", value)}
          />
          <TextField
            label="Phone"
            value={draft.fromPhone}
            onChange={(value) => set("fromPhone", value)}
          />
          <TextField
            label="Website"
            value={draft.fromWebsite}
            onChange={(value) => set("fromWebsite", value)}
          />
          <TextField
            label="Tax number"
            value={draft.fromTaxNumber}
            onChange={(value) => set("fromTaxNumber", value)}
          />
          <TextField
            label="Registration number"
            value={draft.fromRegistration}
            onChange={(value) => set("fromRegistration", value)}
          />
          <TextAreaField
            label="Address"
            value={draft.fromAddress}
            onChange={(value) => set("fromAddress", value)}
            className="sm:col-span-2"
            rows={2}
          />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Notes &amp; terms</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextAreaField
            label="Notes"
            value={draft.notes}
            onChange={(value) => set("notes", value)}
          />
          <TextAreaField
            label="Terms"
            value={draft.terms}
            onChange={(value) => set("terms", value)}
          />
          <TextField
            label="Footer"
            value={draft.footer}
            onChange={(value) => set("footer", value)}
            className="sm:col-span-2"
          />
        </div>
      </section>
    </div>
  );

  const preview = (
    <div className="lg:sticky lg:top-4">
      <InvoicePreview view={view} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {invoiceId ? "Edit invoice" : "New invoice"}
          </h1>
          <p className="text-sm text-slate-500">
            {saving
              ? "Saving\u2026"
              : savedAt
                ? `Saved at ${savedAt}`
                : "Changes to drafts save automatically"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedId ? (
            <>
              <Link href={`/invoices/${savedId}`} className="btn-secondary">
                View
              </Link>
              <a
                href={`/api/invoices/${savedId}/pdf`}
                className="btn-secondary"
                target="_blank"
                rel="noreferrer"
              >
                PDF
              </a>
              <a
                href={`/invoices/${savedId}/print`}
                className="btn-secondary"
                target="_blank"
                rel="noreferrer"
              >
                Print
              </a>
            </>
          ) : null}
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={async () => {
              const id = await save();
              if (id) router.push(`/invoices/${id}`);
            }}
          >
            Save invoice
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="no-print flex gap-2 lg:hidden">
        <button
          type="button"
          className={mobileTab === "edit" ? "btn-primary flex-1" : "btn-secondary flex-1"}
          onClick={() => setMobileTab("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          className={mobileTab === "preview" ? "btn-primary flex-1" : "btn-secondary flex-1"}
          onClick={() => setMobileTab("preview")}
        >
          Preview
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={mobileTab === "edit" ? "no-print" : "hidden lg:block no-print"}>
          {editor}
        </div>
        <div className={mobileTab === "preview" ? "" : "hidden lg:block"}>{preview}</div>
      </div>
    </div>
  );
}
