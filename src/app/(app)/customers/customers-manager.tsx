"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import {
  CustomerFields,
  EMPTY_CUSTOMER,
  type CustomerValues,
} from "@/components/customer-fields";
import { api, ApiError } from "@/lib/client";
import { formatMoney } from "@/lib/currency";

export interface CustomerRow extends CustomerValues {
  id: string;
  invoiceCount: number;
  totalInvoiced: number;
  outstanding: number;
}

export function CustomersManager({
  customers,
  initialQuery,
  currency,
}: {
  customers: CustomerRow[];
  initialQuery: string;
  currency: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<CustomerValues>(EMPTY_CUSTOMER);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function openCreate() {
    setEditingId(null);
    setValues(EMPTY_CUSTOMER);
    setFormOpen(true);
    setError("");
  }

  function openEdit(customer: CustomerRow) {
    setEditingId(customer.id);
    setValues({
      name: customer.name,
      companyName: customer.companyName,
      addressLine1: customer.addressLine1,
      addressLine2: customer.addressLine2,
      city: customer.city,
      state: customer.state,
      country: customer.country,
      postalCode: customer.postalCode,
      email: customer.email,
      phone: customer.phone,
      taxNumber: customer.taxNumber,
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
        await api(`/api/customers/${editingId}`, { method: "PATCH", body: values });
      } else {
        await api("/api/customers", { method: "POST", body: values });
      }
      setFormOpen(false);
      setValues(EMPTY_CUSTOMER);
      setEditingId(null);
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.issues
            ? Object.values(caught.issues).flat().filter(Boolean).join(" ") || caught.message
            : caught.message
          : "Could not save the customer.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await api(`/api/customers/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete the customer.");
    }
  }

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/customers${params.size ? `?${params.toString()}` : ""}`);
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
            placeholder="Search name, company or email"
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
                router.push("/customers");
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
        <button className="btn-primary" onClick={openCreate}>
          + Add customer
        </button>
      </div>

      {formOpen ? (
        <form className="card space-y-4 p-5" onSubmit={save}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {editingId ? "Edit customer" : "New customer"}
          </h2>
          <CustomerFields values={values} onChange={setValues} />
          <div className="flex gap-3">
            <button className="btn-primary" type="submit" disabled={pending}>
              {pending ? "Saving\u2026" : "Save customer"}
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
        {customers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            {initialQuery ? "No customers match that search." : "No customers yet."}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 text-right font-semibold">Invoices</th>
                  <th className="px-5 py-3 text-right font-semibold">Invoiced</th>
                  <th className="px-5 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-semibold text-navy-700 hover:underline"
                      >
                        {customer.name}
                      </Link>
                      <p className="text-xs text-slate-500">{customer.companyName || "\u2014"}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <p>{customer.email || "\u2014"}</p>
                      <p className="text-xs text-slate-500">{customer.phone || "\u2014"}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">{customer.invoiceCount}</td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatMoney(customer.totalInvoiced, currency)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatMoney(customer.outstanding, currency)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary" onClick={() => openEdit(customer)}>
                          Edit
                        </button>
                        <ConfirmButton
                          message="Delete customer?"
                          confirmLabel="Delete"
                          onConfirm={() => remove(customer.id)}
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
