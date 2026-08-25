"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { api, ApiError } from "@/lib/client";

export function InvoiceRowActions({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: string }>(`/api/invoices/${invoiceId}/duplicate`, {
        method: "POST",
      });
      router.push(`/invoices/${result.id}/edit`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not duplicate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <Link href={`/invoices/${invoiceId}/edit`} className="btn-secondary">
        Edit
      </Link>
      <a
        href={`/api/invoices/${invoiceId}/pdf?download=1`}
        className="btn-secondary"
        target="_blank"
        rel="noreferrer"
      >
        PDF
      </a>
      <button type="button" className="btn-secondary" disabled={busy} onClick={duplicate}>
        Duplicate
      </button>
      <ConfirmButton
        message="Delete invoice?"
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api(`/api/invoices/${invoiceId}`, { method: "DELETE" });
            router.refresh();
          } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : "Could not delete");
          }
        }}
      >
        Delete
      </ConfirmButton>
    </div>
  );
}
