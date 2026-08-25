"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import {
  CustomerFields,
  EMPTY_CUSTOMER,
  type CustomerValues,
} from "@/components/customer-fields";
import { TextAreaField } from "@/components/field";
import { api, ApiError } from "@/lib/client";
import { formatMoney } from "@/lib/currency";
import { stateLabel } from "@/lib/states";

export interface SupplierValues extends CustomerValues {
  notes: string;
}

export const EMPTY_SUPPLIER: SupplierValues = { ...EMPTY_CUSTOMER, notes: "" };

export interface SupplierRow extends SupplierValues {
  id: string;
  billCount: number;
  totalPurchased: number;
  outstanding: number;
}

export function SuppliersManager({
  suppliers,
  initialQuery,
  currency,
}: {
  suppliers: SupplierRow[];
  initialQuery: string;
  currency: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<SupplierValues>(EMPTY_SUPPLIER);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function openCreate() {
    setEditingId(null);
    setValues(EMPTY_SUPPLIER);
    setFormOpen(true);
    setError("");
  }

  function openEdit(supplier: SupplierRow) {
    setEditingId(supplier.id);
    setValues({
      name: supplier.name,
      companyName: supplier.companyName,
      addressLine1: supplier.addressLine1,
      addressLine2: supplier.addressLine2,
      city: supplier.city,
      state: supplier.state,
      stateCode: supplier.stateCode,
      country: supplier.country,
      postalCode: supplier.postalCode,
      email: supplier.email,
      phone: supplier.phone,
      taxNumber: supplier.taxNumber,
      notes: supplier.notes,
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
        await api(`/api/suppliers/${editingId}`, { method: "PATCH", body: values });
      } else {
        await api("/api/suppliers", { method: "POST", body: values });
      }
      setFormOpen(false);
      setValues(EMPTY_SUPPLIER);
      setEditingId(null);
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.issues
            ? Object.values(caught.issues).flat().filter(Boolean).join(" ") || caught.message
            : caught.message
          : "Could not save the supplier.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await api(`/api/suppliers/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete the supplier.");
    }
  }

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/suppliers${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex flex-1 gap-2" onSubmit={search}>
          <input
            className="input max-w-sm"
            placeholder="Search name, company, GSTIN or email"
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
                router.push("/suppliers");
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
        <button className="btn-primary" onClick={openCreate}>
          + Add supplier
        </button>
      </div>

      {formOpen ? (
        <form className="card space-y-4 p-5" onSubmit={save}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {editingId ? "Edit supplier" : "New supplier"}
          </h2>
          <CustomerFields
            values={values}
            onChange={(next) => setValues((current) => ({ ...current, ...next }))}
          />
          <TextAreaField
            label="Notes"
            value={values.notes}
            onChange={(value) => setValues((current) => ({ ...current, notes: value }))}
            rows={2}
          />
          <div className="flex gap-3">
            <button className="btn-primary" type="submit" disabled={pending}>
              {pending ? "Saving\u2026" : "Save supplier"}
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
        {suppliers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            {initialQuery ? "No suppliers match that search." : "No suppliers yet."}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Supplier</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">State</th>
                  <th className="px-5 py-3 text-right font-semibold">Bills</th>
                  <th className="px-5 py-3 text-right font-semibold">Purchased</th>
                  <th className="px-5 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{supplier.name}</p>
                      <p className="text-xs text-slate-500">{supplier.companyName || "\u2014"}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <p>{supplier.email || "\u2014"}</p>
                      <p className="text-xs text-slate-500">{supplier.phone || "\u2014"}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {stateLabel(supplier.stateCode) || "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">{supplier.billCount}</td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatMoney(supplier.totalPurchased, currency)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatMoney(supplier.outstanding, currency)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary" onClick={() => openEdit(supplier)}>
                          Edit
                        </button>
                        <ConfirmButton
                          message="Delete supplier?"
                          confirmLabel="Delete"
                          onConfirm={() => remove(supplier.id)}
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
