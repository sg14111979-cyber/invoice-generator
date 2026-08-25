"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SelectField, TextField } from "@/components/field";
import { api, ApiError } from "@/lib/client";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/currency";

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code as string,
  label: `${code} \u2014 ${CURRENCIES[code].label}`,
}));

export function SetupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    email: "",
    password: "",
    currency: "INR",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        try {
          await api("/api/setup", { method: "POST", body: form });
          router.replace("/dashboard");
        } catch (caught) {
          setError(caught instanceof ApiError ? caught.message : "Could not complete setup");
          setPending(false);
        }
      }}
    >
      <TextField
        label="Your name"
        value={form.name}
        onChange={(value) => setForm((current) => ({ ...current, name: value }))}
        placeholder="Priya Sharma"
        required
      />
      <TextField
        label="Business name"
        value={form.businessName}
        onChange={(value) => setForm((current) => ({ ...current, businessName: value }))}
        placeholder="Sharma Traders"
        hint="This appears at the top of your invoices."
        required
      />
      <TextField
        label="Email (this is your login)"
        type="email"
        value={form.email}
        onChange={(value) => setForm((current) => ({ ...current, email: value }))}
        placeholder="you@yourbusiness.com"
        required
      />
      <TextField
        label="Choose a password"
        type="password"
        value={form.password}
        onChange={(value) => setForm((current) => ({ ...current, password: value }))}
        hint="At least 8 characters. Keep it safe — nobody can email it back to you."
        required
      />
      <SelectField
        label="Currency you invoice in"
        value={form.currency}
        onChange={(value) => setForm((current) => ({ ...current, currency: value }))}
        options={CURRENCY_OPTIONS}
      />

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full justify-center" disabled={pending}>
        {pending ? "Setting up\u2026" : "Start invoicing"}
      </button>
    </form>
  );
}
