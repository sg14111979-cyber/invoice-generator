"use client";

import { useState } from "react";

interface ConfirmButtonProps {
  onConfirm: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  confirmLabel?: string;
  message?: string;
}

/**
 * Two-step destructive action: the first click reveals an inline confirmation
 * instead of relying on a native dialog.
 */
export function ConfirmButton({
  onConfirm,
  children,
  className = "btn-danger",
  confirmLabel = "Confirm",
  message = "Are you sure?",
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);

  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-slate-600">{message}</span>
      <button
        type="button"
        className="btn-danger"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await onConfirm();
          } finally {
            setPending(false);
            setArmed(false);
          }
        }}
      >
        {pending ? "Working\u2026" : confirmLabel}
      </button>
      <button type="button" className="btn-secondary" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  );
}
