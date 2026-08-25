"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { NumberField, SelectField, TextAreaField, TextField } from "@/components/field";
import { StateField } from "@/components/state-field";
import { calculateInvoice, round2, type DiscountType, type TaxMode } from "@/lib/calc";
import { api, ApiError } from "@/lib/client";
import { CURRENCIES, CURRENCY_CODES, formatMoney } from "@/lib/currency";
import { itemToDraftItem, newItem, type ItemOption } from "@/lib/invoice-draft";
import {
  purchaseDraftToPayload,
  type PurchaseBrandOption,
  type PurchaseDraft,
  type SupplierOption,
} from "@/lib/purchase-draft";
import { PURCHASE_STATUSES } from "@/lib/schemas";
import { stateLabel, supplyType, type SupplyType } from "@/lib/states";

interface Props {
  brands: PurchaseBrandOption[];
  suppliers: SupplierOption[];
  catalog: ItemOption[];
  initialDraft: PurchaseDraft;
  purchaseId: string | null;
}

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code as string,
  label: `${code} \u2014 ${CURRENCIES[code].label}`,
}));

const STATUS_OPTIONS = PURCHASE_STATUSES.map((status) => ({
  value: status,
  label: status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" "),
}));

function catalogLabel(option: ItemOption): string {
  return option.code ? `${option.code} \u2014 ${option.name}` : option.name;
}

export function PurchaseEditor({
  brands,
  suppliers,
  catalog,
  initialDraft,
  purchaseId,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<PurchaseDraft>(initialDraft);
  const [savedId, setSavedId] = useState<string | null>(purchaseId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totals = useMemo(
    () =>
      calculateInvoice({
        items: draft.items,
        taxMode: draft.taxMode as TaxMode,
        taxRate: draft.taxRate,
        cgstRate: draft.cgstRate,
        sgstRate: draft.sgstRate,
        igstRate: draft.igstRate,
        discountType: draft.discountType as DiscountType,
        discountValue: draft.discountValue,
        shippingAmount: draft.shippingAmount,
        amountPaid: draft.amountPaid,
      }),
    [draft],
  );

  const set = useCallback(<K extends keyof PurchaseDraft>(key: K, value: PurchaseDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const setItem = useCallback(
    <K extends keyof PurchaseDraft["items"][number]>(
      index: number,
      key: K,
      value: PurchaseDraft["items"][number][K],
    ) => {
      setDraft((current) => ({
        ...current,
        items: current.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
      }));
    },
    [],
  );

  function applyBrand(brandId: string) {
    const brand = brands.find((option) => option.id === brandId);
    if (!brand) return;
    setDraft((current) => ({
      ...current,
      brandId,
      brandStateCode: brand.stateCode,
      currency: brand.currency,
    }));
  }

  function applySupplier(supplierId: string) {
    if (!supplierId) {
      set("supplierId", null);
      return;
    }
    const supplier = suppliers.find((option) => option.id === supplierId);
    if (!supplier) return;
    setDraft((current) => ({
      ...current,
      supplierId,
      supplierName: supplier.name,
      supplierCompany: supplier.companyName,
      supplierAddress: supplier.address,
      supplierEmail: supplier.email,
      supplierPhone: supplier.phone,
      supplierTaxNumber: supplier.taxNumber,
      supplierStateCode: supplier.stateCode,
    }));
  }

  /** Accepts a code, a name or the "CODE — Name" label the datalist offers. */
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
    setDraft((current) => ({
      ...current,
      items: current.items.map((line, i) => (i === index ? itemToDraftItem(option, line) : line)),
    }));
  }

  function addItem() {
    setDraft((current) => ({ ...current, items: [...current.items, newItem()] }));
  }

  function removeItem(index: number) {
    setDraft((current) => {
      const items = current.items.filter((_, i) => i !== index);
      return { ...current, items: items.length > 0 ? items : [newItem()] };
    });
  }

  const isGst = draft.taxMode === "GST";
  const supply = supplyType(draft.brandStateCode, draft.supplierStateCode);
  const gstRate = round2(draft.cgstRate + draft.sgstRate + draft.igstRate);
  const gstSplitWrong =
    isGst &&
    gstRate > 0 &&
    ((supply === "INTRA" && draft.igstRate > 0) ||
      (supply === "INTER" && draft.cgstRate + draft.sgstRate > 0));

  function applySupplyType(next: SupplyType) {
    setDraft((current) => {
      const total = round2(current.cgstRate + current.sgstRate + current.igstRate);
      return next === "INTER"
        ? { ...current, cgstRate: 0, sgstRate: 0, igstRate: total }
        : { ...current, cgstRate: round2(total / 2), sgstRate: round2(total / 2), igstRate: 0 };
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = purchaseDraftToPayload(draft);
      const result = savedId
        ? await api<{ id: string }>(`/api/purchases/${savedId}`, {
            method: "PATCH",
            body: payload,
          })
        : await api<{ id: string }>("/api/purchases", { method: "POST", body: payload });
      setSavedId(result.id);
      router.push(`/purchases/${result.id}`);
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.issues
            ? Object.values(caught.issues).flat().filter(Boolean).join(" ") || caught.message
            : caught.message
          : "Could not save the purchase bill.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {savedId ? "Edit purchase bill" : "New purchase bill"}
          </h1>
          <p className="text-sm text-slate-500">
            Received bills add stock to the items they reference. Drafts and cancelled bills do
            not.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchases" className="btn-secondary">
            Cancel
          </Link>
          <button className="btn-primary" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving\u2026" : "Save bill"}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      ) : null}

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Bill details</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Brand (buying business)"
            value={draft.brandId}
            onChange={applyBrand}
            options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          />
          <TextField
            label="Supplier bill number"
            value={draft.billNumber}
            onChange={(value) => set("billNumber", value)}
            required
          />
          <SelectField
            label="Status"
            value={draft.status}
            onChange={(value) => set("status", value as PurchaseDraft["status"])}
            options={STATUS_OPTIONS}
          />
          <TextField
            label="Bill date"
            type="date"
            value={draft.billDate}
            onChange={(value) => set("billDate", value)}
          />
          <TextField
            label="Due date"
            type="date"
            value={draft.dueDate ?? ""}
            onChange={(value) => set("dueDate", value)}
          />
          <TextField
            label="Our reference / PO"
            value={draft.reference}
            onChange={(value) => set("reference", value)}
          />
          <SelectField
            label="Currency"
            value={draft.currency}
            onChange={(value) => set("currency", value)}
            options={CURRENCY_OPTIONS}
          />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Supplier</h2>
          <Link href="/suppliers" className="text-xs font-semibold text-navy-700 hover:underline">
            Manage suppliers
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Supplier"
            value={draft.supplierId ?? ""}
            onChange={applySupplier}
            options={[
              { value: "", label: "\u2014 No saved supplier \u2014" },
              ...suppliers.map((supplier) => ({
                value: supplier.id,
                label: supplier.companyName
                  ? `${supplier.name} (${supplier.companyName})`
                  : supplier.name,
              })),
            ]}
          />
          <TextField
            label="Name"
            value={draft.supplierName}
            onChange={(value) => set("supplierName", value)}
          />
          <TextField
            label="Company"
            value={draft.supplierCompany}
            onChange={(value) => set("supplierCompany", value)}
          />
          <TextField
            label="GSTIN / tax number"
            value={draft.supplierTaxNumber}
            onChange={(value) => set("supplierTaxNumber", value)}
          />
          <TextField
            label="Email"
            value={draft.supplierEmail}
            onChange={(value) => set("supplierEmail", value)}
          />
          <TextField
            label="Phone"
            value={draft.supplierPhone}
            onChange={(value) => set("supplierPhone", value)}
          />
          <StateField
            label="Supplier state (GST code)"
            code={draft.supplierStateCode}
            gstin={draft.supplierTaxNumber}
            onChange={(code) => set("supplierStateCode", code)}
          />
          <TextAreaField
            label="Address"
            value={draft.supplierAddress}
            onChange={(value) => set("supplierAddress", value)}
            rows={2}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Items received</h2>
          <Link href="/items" className="text-xs font-semibold text-navy-700 hover:underline">
            Manage items
          </Link>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Pick saved items so the quantities land in stock. Free-text lines are billed but not
          tracked.
        </p>
        <datalist id="purchase-catalog-items">
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
                    list="purchase-catalog-items"
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
                  {formatMoney(totals.lines[index]?.net ?? 0, draft.currency)}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {item.itemId ? (
                  <span className="self-center text-xs font-semibold text-emerald-700">
                    Tracked in stock
                  </span>
                ) : (
                  <span className="self-center text-xs text-slate-400">Not stock tracked</span>
                )}
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
              Your state <strong>{stateLabel(draft.brandStateCode) || "not set on this brand"}</strong>{" "}
              &rarr; supplier <strong>{stateLabel(draft.supplierStateCode) || "not set"}</strong>
              {supply === "INTRA" ? " \u00b7 same state, supplier charges CGST + SGST" : null}
              {supply === "INTER" ? " \u00b7 different states, supplier charges IGST" : null}
            </p>
            {gstSplitWrong ? (
              <button
                type="button"
                className="mt-1 font-semibold text-navy-700 hover:underline"
                onClick={() => applySupplyType(supply === "INTRA" ? "INTRA" : "INTER")}
              >
                {supply === "INTRA" ? `Split ${gstRate}% into CGST + SGST` : `Move ${gstRate}% to IGST`}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Tax mode"
            value={draft.taxMode}
            onChange={(value) => set("taxMode", value as PurchaseDraft["taxMode"])}
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
            onChange={(value) => set("discountType", value as PurchaseDraft["discountType"])}
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
            label="Freight / shipping"
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
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
        <TextAreaField
          label="Internal notes"
          value={draft.notes}
          onChange={(value) => set("notes", value)}
          rows={3}
          className="mt-3"
        />
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Totals</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(totals.subtotal, draft.currency)} />
          <Row label="Discount" value={`- ${formatMoney(totals.discountAmount, draft.currency)}`} />
          <Row label="Taxable" value={formatMoney(totals.taxableAmount, draft.currency)} />
          {isGst ? (
            <>
              <Row label="CGST" value={formatMoney(totals.cgstAmount, draft.currency)} />
              <Row label="SGST" value={formatMoney(totals.sgstAmount, draft.currency)} />
              <Row label="IGST" value={formatMoney(totals.igstAmount, draft.currency)} />
            </>
          ) : (
            <Row label="Tax" value={formatMoney(totals.taxAmount, draft.currency)} />
          )}
          <Row label="Shipping" value={formatMoney(totals.shippingAmount, draft.currency)} />
          <Row label="Total" value={formatMoney(totals.total, draft.currency)} strong />
          <Row label="Paid" value={formatMoney(totals.amountPaid, draft.currency)} />
          <Row label="Balance due" value={formatMoney(totals.balanceDue, draft.currency)} strong />
        </dl>
      </section>

      <div className="flex justify-end gap-2 pb-6">
        <button className="btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving\u2026" : "Save bill"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-semibold text-slate-900" : "text-slate-500"}>{label}</dt>
      <dd className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>{value}</dd>
    </div>
  );
}
