"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { SelectField, TextAreaField, TextField } from "@/components/field";
import { api, ApiError } from "@/lib/client";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/currency";

type Tab = "account" | "invoice" | "tax" | "pdf" | "security";

interface Preferences {
  defaultCurrency: string;
  defaultPaymentTerms: string;
  defaultNotes: string;
  defaultFooter: string;
  paperSize: "A4" | "Letter";
  logoPosition: "left" | "right";
  fontSize: "compact" | "normal" | "large";
  defaultTemplate: "modern" | "corporate" | "classic";
}

interface BrandTaxSummary {
  id: string;
  name: string;
  currency: string;
  taxMode: string;
  gstEnabled: boolean;
  defaultTaxRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  numberFormat: string;
  invoicePrefix: string;
  nextNumber: number;
}

interface Props {
  profile: { name: string; email: string };
  preferences: Preferences;
  brands: BrandTaxSummary[];
  sessionCount: number;
  role: string;
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "account", label: "Account" },
  { id: "invoice", label: "Invoice" },
  { id: "tax", label: "Tax" },
  { id: "pdf", label: "PDF" },
  { id: "security", label: "Security" },
];

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code as string,
  label: `${code} \u2014 ${CURRENCIES[code].label}`,
}));

export function SettingsTabs({ profile, preferences, brands, sessionCount, role }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("account");
  const [profileForm, setProfileForm] = useState(profile);
  const [prefs, setPrefs] = useState(preferences);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(section: string, values: unknown, successMessage: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ signedOut?: boolean }>("/api/settings", {
        method: "PATCH",
        body: { section, values },
      });
      if (result.signedOut) {
        window.location.href = "/login";
        return;
      }
      setMessage(successMessage);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "btn-primary" : "btn-secondary"}
            onClick={() => {
              setTab(item.id);
              setMessage("");
              setError("");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {tab === "account" ? (
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Account</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Full name"
              value={profileForm.name}
              onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))}
            />
            <TextField
              label="Email"
              type="email"
              value={profileForm.email}
              onChange={(value) => setProfileForm((current) => ({ ...current, email: value }))}
            />
          </div>
          <p className="text-xs text-slate-500">Role: {role === "ADMIN" ? "Administrator" : "User"}</p>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => submit("profile", profileForm, "Account updated")}
          >
            Save account
          </button>
        </section>
      ) : null}

      {tab === "invoice" ? (
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Invoice defaults</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              label="Default currency"
              value={prefs.defaultCurrency}
              onChange={(value) => setPrefs((current) => ({ ...current, defaultCurrency: value }))}
              options={CURRENCY_OPTIONS}
            />
            <TextField
              label="Default payment terms"
              value={prefs.defaultPaymentTerms}
              onChange={(value) =>
                setPrefs((current) => ({ ...current, defaultPaymentTerms: value }))
              }
            />
            <TextAreaField
              label="Default notes"
              value={prefs.defaultNotes}
              onChange={(value) => setPrefs((current) => ({ ...current, defaultNotes: value }))}
              className="sm:col-span-2"
            />
            <TextField
              label="Default footer"
              value={prefs.defaultFooter}
              onChange={(value) => setPrefs((current) => ({ ...current, defaultFooter: value }))}
              className="sm:col-span-2"
            />
          </div>
          <p className="text-xs text-slate-500">
            Per-brand numbering overrides these defaults: {brands.length} brand(s) configured.
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => submit("preferences", prefs, "Invoice defaults updated")}
          >
            Save defaults
          </button>
        </section>
      ) : null}

      {tab === "tax" ? (
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Tax configuration</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tax rules are per brand so each business can bill under its own GST/VAT setup.
          </p>
          <div className="table-wrap mt-3">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Currency</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Rates</th>
                  <th className="px-3 py-2">Numbering</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{brand.name}</td>
                    <td className="px-3 py-2">{brand.currency}</td>
                    <td className="px-3 py-2">{brand.gstEnabled ? "GST" : brand.taxMode}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {brand.gstEnabled
                        ? `CGST ${brand.cgstRate}% / SGST ${brand.sgstRate}% / IGST ${brand.igstRate}%`
                        : `${brand.defaultTaxRate}%`}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {brand.numberFormat} (next {brand.nextNumber})
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/brands/${brand.id}`} className="btn-secondary">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "pdf" ? (
        <section className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-slate-900">PDF &amp; print</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField
              label="Paper size"
              value={prefs.paperSize}
              onChange={(value) => setPrefs((current) => ({ ...current, paperSize: value }))}
              options={[
                { value: "A4", label: "A4" },
                { value: "Letter", label: "Letter" },
              ]}
            />
            <SelectField
              label="Default template"
              value={prefs.defaultTemplate}
              onChange={(value) => setPrefs((current) => ({ ...current, defaultTemplate: value }))}
              options={[
                { value: "modern", label: "Modern" },
                { value: "corporate", label: "Corporate" },
                { value: "classic", label: "Classic" },
              ]}
            />
            <SelectField
              label="Logo position"
              value={prefs.logoPosition}
              onChange={(value) => setPrefs((current) => ({ ...current, logoPosition: value }))}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
            />
            <SelectField
              label="Font size"
              value={prefs.fontSize}
              onChange={(value) => setPrefs((current) => ({ ...current, fontSize: value }))}
              options={[
                { value: "compact", label: "Compact" },
                { value: "normal", label: "Normal" },
                { value: "large", label: "Large" },
              ]}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => submit("preferences", prefs, "PDF preferences updated")}
          >
            Save PDF settings
          </button>
        </section>
      ) : null}

      {tab === "security" ? (
        <section className="card space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Current password"
                type="password"
                value={passwords.currentPassword}
                onChange={(value) =>
                  setPasswords((current) => ({ ...current, currentPassword: value }))
                }
              />
              <TextField
                label="New password"
                type="password"
                value={passwords.newPassword}
                onChange={(value) => setPasswords((current) => ({ ...current, newPassword: value }))}
                hint="At least 8 characters. All devices are signed out afterwards."
              />
            </div>
            <button
              type="button"
              className="btn-primary mt-3"
              disabled={busy}
              onClick={() => submit("password", passwords, "Password updated")}
            >
              Update password
            </button>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">Active sessions</h2>
            <p className="mt-1 text-sm text-slate-600">
              {sessionCount} active session(s). Signing out everywhere invalidates every stored
              session token.
            </p>
            <div className="mt-3">
              <ConfirmButton
                message="Sign out of all devices?"
                confirmLabel="Sign out everywhere"
                onConfirm={async () => {
                  try {
                    await api("/api/settings/sessions", { method: "DELETE" });
                    window.location.href = "/login";
                  } catch (caught) {
                    setError(caught instanceof ApiError ? caught.message : "Could not sign out");
                  }
                }}
              >
                Sign out everywhere
              </ConfirmButton>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
