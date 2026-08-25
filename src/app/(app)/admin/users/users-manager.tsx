"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { SelectField, TextField } from "@/components/field";
import { api, ApiError } from "@/lib/client";
import { formatDisplayDate } from "@/lib/format";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  invoiceCount: number;
  brandCount: number;
}

const ROLE_OPTIONS = [
  { value: "USER", label: "User" },
  { value: "ADMIN", label: "Administrator" },
];

export function UsersManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "USER" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add a user</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            label="Full name"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
          />
          <TextField
            label="Temporary password"
            type="password"
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            hint="At least 8 characters"
          />
          <SelectField
            label="Role"
            value={form.role}
            onChange={(value) => setForm((current) => ({ ...current, role: value }))}
            options={ROLE_OPTIONS}
          />
        </div>
        <button
          type="button"
          className="btn-primary mt-3"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api("/api/admin/users", { method: "POST", body: form });
              setForm({ name: "", email: "", password: "", role: "USER" });
            })
          }
        >
          Create user
        </button>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Brands</th>
                <th className="px-4 py-3">Invoices</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {user.name}
                    {user.id === currentUserId ? (
                      <span className="ml-2 text-xs text-slate-400">(you)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input"
                      value={user.role}
                      disabled={busy}
                      onChange={(event) =>
                        run(async () => {
                          await api(`/api/admin/users/${user.id}`, {
                            method: "PATCH",
                            body: { role: event.target.value },
                          });
                        })
                      }
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.brandCount}</td>
                  <td className="px-4 py-3 text-slate-600">{user.invoiceCount}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDisplayDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {user.id === currentUserId ? null : (
                      <ConfirmButton
                        message="Delete user and all their data?"
                        confirmLabel="Delete"
                        onConfirm={() =>
                          run(async () => {
                            await api(`/api/admin/users/${user.id}`, { method: "DELETE" });
                          })
                        }
                      >
                        Delete
                      </ConfirmButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
