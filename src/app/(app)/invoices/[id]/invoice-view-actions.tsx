"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { api, ApiError } from "@/lib/client";

export function InvoiceViewActions({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        Print
      </button>
      <a
        href={`/api/invoices/${invoiceId}/pdf?download=1`}
        className="btn-primary"
        target="_blank"
        rel="noreferrer"
      >
        Download PDF
      </a>
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          try {
            const result = await api<{ id: string }>(`/api/invoices/${invoiceId}/duplicate`, {
              method: "POST",
            });
            router.push(`/invoices/${result.id}/edit`);
          } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : "Could not duplicate");
          }
        }}
      >
        Duplicate
      </button>
      <ConfirmButton
        message="Delete invoice?"
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api(`/api/invoices/${invoiceId}`, { method: "DELETE" });
            router.push("/invoices");
          } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : "Could not delete");
          }
        }}
      >
        Delete
      </ConfirmButton>
    </>
  );
}
