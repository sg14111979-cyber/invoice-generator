"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NumberField, SelectField, TextField } from "@/components/field";
import { api, ApiError } from "@/lib/client";

interface AdjustItem {
  id: string;
  label: string;
}

/** Manual corrections: damage, wastage, a stock count or goods used in-house. */
export function StockAdjustForm({ items }: { items: AdjustItem[] }) {
  const router = useRouter();
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Add a stock-tracked item first and you can correct its quantity here.
      </p>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/stock/adjustments", {
        method: "POST",
        body: { itemId, quantity, unitCost, note },
      });
      setQuantity(0);
      setNote("");
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.issues
            ? Object.values(caught.issues).flat().filter(Boolean).join(" ") || caught.message
            : caught.message
          : "Could not save the adjustment.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      {error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200"
        >
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Item"
          value={itemId}
          onChange={setItemId}
          options={items.map((item) => ({ value: item.id, label: item.label }))}
        />
        <NumberField
          label="Quantity"
          value={quantity}
          onChange={setQuantity}
          step={0.01}
          min={-1_000_000}
          hint="Positive adds stock, negative removes it."
        />
        <NumberField label="Unit cost" value={unitCost} onChange={setUnitCost} step={0.01} />
        <TextField label="Reason" value={note} onChange={setNote} placeholder="Damaged in transit" />
      </div>
      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving\u2026" : "Record adjustment"}
      </button>
    </form>
  );
}
