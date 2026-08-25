"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { CheckboxField, NumberField, TextAreaField, TextField } from "@/components/field";
import { api, ApiError } from "@/lib/client";
import { formatMoney } from "@/lib/currency";

export interface ItemValues {
  code: string;
  name: string;
  description: string;
  unit: string;
  rate: number;
  purchaseRate: number;
  taxRate: number;
  hsnCode: string;
  notes: string;
  trackStock: boolean;
  openingStock: number;
  lowStockLevel: number;
}

export interface ItemRow extends ItemValues {
  id: string;
  onHand: number;
  lowStock: boolean;
}

export const EMPTY_ITEM: ItemValues = {
  code: "",
  name: "",
  description: "",
  unit: "",
  rate: 0,
  purchaseRate: 0,
  taxRate: 0,
  hsnCode: "",
  notes: "",
  trackStock: true,
  openingStock: 0,
  lowStockLevel: 0,
};

export function ItemsManager({
  items,
  initialQuery,
  currency,
}: {
  items: ItemRow[];
  initialQuery: string;
  currency: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<ItemValues>(EMPTY_ITEM);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function field<K extends keyof ItemValues>(key: K, value: ItemValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setValues(EMPTY_ITEM);
    setFormOpen(true);
    setError("");
  }

  function openEdit(item: ItemRow) {
    setEditingId(item.id);
    setValues({
      code: item.code,
      name: item.name,
      description: item.description,
      unit: item.unit,
      rate: item.rate,
      purchaseRate: item.purchaseRate,
      taxRate: item.taxRate,
      hsnCode: item.hsnCode,
      notes: item.notes,
      trackStock: item.trackStock,
      openingStock: item.openingStock,
      lowStockLevel: item.lowStockLevel,
    });
    setFormOpen(true);
    setError("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      if (editingId) {
        await api(`/api/items/${editingId}`, { method: "PATCH", body: values });
      } else {
        await api("/api/items", { method: "POST", body: values });
      }
      setFormOpen(false);
      setValues(EMPTY_ITEM);
      setEditingId(null);
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.issues
            ? Object.values(caught.issues).flat().filter(Boolean).join(" ") || caught.message
            : caught.message
          : "Could not save the item.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await api(`/api/items/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete the item.");
    }
  }

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/items${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex flex-1 gap-2" onSubmit={search}>
          <input
            className="input max-w-sm"
            placeholder="Search code, name or HSN/SAC"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="btn-secondary" type="submit">
            Search
          </button>
          {initialQuery ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setQuery("");
                router.push("/items");
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
        <button className="btn-primary" onClick={openCreate}>
          + Add item
        </button>
      </div>

      {formOpen ? (
        <form className="card space-y-4 p-5" onSubmit={save}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {editingId ? "Edit item" : "New item"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              label="Code"
              value={values.code}
              onChange={(value) => field("code", value)}
              placeholder="A4-COPY-80"
              hint="Your own short code. Leave blank if you only search by name."
            />
            <TextField
              label="Name"
              value={values.name}
              onChange={(value) => field("name", value)}
              placeholder="A4 copier paper 80 GSM"
              required
            />
            <TextField
              label="Unit"
              value={values.unit}
              onChange={(value) => field("unit", value)}
              placeholder="ream"
            />
            <NumberField
              label="Selling rate"
              value={values.rate}
              onChange={(value) => field("rate", value)}
              step={0.01}
            />
            <NumberField
              label="Purchase rate"
              value={values.purchaseRate}
              onChange={(value) => field("purchaseRate", value)}
              step={0.01}
              hint="Used to value the stock you hold."
            />
            <NumberField
              label="Tax rate"
              suffix="%"
              value={values.taxRate}
              onChange={(value) => field("taxRate", value)}
              step={0.01}
              max={100}
            />
            <TextField
              label="HSN / SAC"
              value={values.hsnCode}
              onChange={(value) => field("hsnCode", value)}
            />
            <TextAreaField
              label="Description on the invoice"
              value={values.description}
              onChange={(value) => field("description", value)}
              className="sm:col-span-2 lg:col-span-3"
              rows={2}
            />
            <TextAreaField
              label="Private notes"
              value={values.notes}
              onChange={(value) => field("notes", value)}
              className="sm:col-span-2 lg:col-span-3"
              rows={2}
            />
            <CheckboxField
              label="Track stock for this item"
              checked={values.trackStock}
              onChange={(value) => field("trackStock", value)}
              hint="Purchases add quantity, invoices remove it. Turn off for services."
            />
            <NumberField
              label="Opening stock"
              value={values.openingStock}
              onChange={(value) => field("openingStock", value)}
              step={0.01}
              hint="Quantity you already had before using this app."
            />
            <NumberField
              label="Low stock alert at"
              value={values.lowStockLevel}
              onChange={(value) => field("lowStockLevel", value)}
              step={0.01}
              hint="0 turns the alert off."
            />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" type="submit" disabled={pending}>
              {pending ? "Saving\u2026" : "Save item"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="card">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            {initialQuery
              ? "No items match that search."
              : "No saved items yet. Add the things you sell most often."}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Item</th>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-5 py-3 text-right font-semibold">Rate</th>
                  <th className="px-5 py-3 text-right font-semibold">Tax</th>
                  <th className="px-5 py-3 text-right font-semibold">In stock</th>
                  <th className="px-5 py-3 font-semibold">HSN / SAC</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">
                      {item.code || "\u2014"}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.description || "\u2014"}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{item.unit || "\u2014"}</td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatMoney(item.rate, currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{item.taxRate}%</td>
                    <td className="px-5 py-3 text-right">
                      {item.trackStock ? (
                        <span
                          className={
                            item.lowStock ? "font-semibold text-red-600" : "text-slate-900"
                          }
                        >
                          {item.onHand} {item.unit}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not tracked</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{item.hsnCode || "\u2014"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary" onClick={() => openEdit(item)}>
                          Edit
                        </button>
                        <ConfirmButton
                          message="Delete item?"
                          confirmLabel="Delete"
                          onConfirm={() => remove(item.id)}
                        >
                          Delete
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
