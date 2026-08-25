"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { api, ApiError } from "@/lib/client";

export function PurchaseRowActions({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <Link href={`/purchases/${purchaseId}/edit`} className="btn-secondary">
        Edit
      </Link>
      <ConfirmButton
        message="Delete bill? Its stock movements are removed too."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api(`/api/purchases/${purchaseId}`, { method: "DELETE" });
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
