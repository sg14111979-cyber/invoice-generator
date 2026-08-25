"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { api, ApiError } from "@/lib/client";

export function MovementRowActions({ movementId }: { movementId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <ConfirmButton
        message="Remove adjustment?"
        confirmLabel="Remove"
        onConfirm={async () => {
          try {
            await api(`/api/stock/adjustments/${movementId}`, { method: "DELETE" });
            router.refresh();
          } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : "Could not remove");
          }
        }}
      >
        Remove
      </ConfirmButton>
    </div>
  );
}
