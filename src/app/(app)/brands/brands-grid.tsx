"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { api, ApiError } from "@/lib/client";

export interface BrandCard {
  id: string;
  name: string;
  logoPath: string | null;
  email: string;
  phone: string;
  taxNumber: string;
  isDefault: boolean;
  currency: string;
  invoiceCount: number;
}

export function BrandsGrid({ brands }: { brands: BrandCard[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function setDefault(id: string) {
    setError("");
    try {
      await api(`/api/brands/${id}/default`, { method: "POST" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update the brand.");
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await api(`/api/brands/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete the brand.");
    }
  }

  if (brands.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-slate-600">
          No brands yet. Add your first brand to start invoicing.
        </p>
        <Link className="btn-primary mt-4" href="/brands/new">
          + Add brand
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {brands.map((brand) => (
          <div key={brand.id} className="card flex flex-col p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                {brand.logoPath ? (
                  <Image
                    src={brand.logoPath}
                    alt={`${brand.name} logo`}
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-400">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-semibold text-slate-900">{brand.name}</h2>
                  {brand.isDefault ? (
                    <span className="badge bg-navy-50 text-navy-700 ring-navy-200">Default</span>
                  ) : null}
                </div>
                <p className="truncate text-sm text-slate-500">{brand.email || "\u2014"}</p>
                <p className="truncate text-sm text-slate-500">{brand.phone || "\u2014"}</p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Currency</dt>
                <dd className="font-medium text-slate-700">{brand.currency}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Tax number</dt>
                <dd className="truncate font-medium text-slate-700">{brand.taxNumber || "\u2014"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Invoices</dt>
                <dd className="font-medium text-slate-700">{brand.invoiceCount}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Link className="btn-secondary" href={`/brands/${brand.id}`}>
                Edit
              </Link>
              <Link className="btn-secondary" href={`/brands/${brand.id}#invoice-settings`}>
                Invoice settings
              </Link>
              {brand.isDefault ? null : (
                <button className="btn-secondary" onClick={() => setDefault(brand.id)}>
                  Set as default
                </button>
              )}
              <ConfirmButton
                message="Delete this brand?"
                confirmLabel="Delete"
                onConfirm={() => remove(brand.id)}
              >
                Delete
              </ConfirmButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
