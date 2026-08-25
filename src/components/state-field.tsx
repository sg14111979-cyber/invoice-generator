"use client";

import { INDIAN_STATES, stateCodeFromGstin, stateName } from "@/lib/states";

/**
 * State picker that also fills the plain-text state name, so an address keeps
 * reading normally while GST gets the numeric code it needs.
 */
export function StateField({
  code,
  onChange,
  label = "State (GST code)",
  gstin,
  className,
}: {
  code: string;
  onChange: (code: string, name: string) => void;
  label?: string;
  gstin?: string;
  className?: string;
}) {
  const suggestion = gstin ? stateCodeFromGstin(gstin) : "";
  const showSuggestion = Boolean(suggestion) && suggestion !== code;

  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <select
        className="input"
        value={code}
        onChange={(event) => onChange(event.target.value, stateName(event.target.value))}
      >
        <option value="">Not set / outside India</option>
        {INDIAN_STATES.map((state) => (
          <option key={state.code} value={state.code}>
            {state.code} — {state.name}
          </option>
        ))}
      </select>
      {showSuggestion ? (
        <button
          type="button"
          className="mt-1 text-xs font-semibold text-navy-700 hover:underline"
          onClick={() => onChange(suggestion, stateName(suggestion))}
        >
          GSTIN starts with {suggestion}: use {stateName(suggestion)}
        </button>
      ) : (
        <span className="mt-1 block text-xs text-slate-500">
          Same state as your business means CGST + SGST, a different state means IGST.
        </span>
      )}
    </label>
  );
}
