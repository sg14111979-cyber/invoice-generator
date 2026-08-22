import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in | Invoice Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  // A brand-new install has no accounts yet: send the first visitor to the wizard.
  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <section className="hidden flex-1 bg-navy-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-navy-200">
            Invoice Studio
          </p>
          <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">
            Professional invoicing for every brand you run.
          </h1>
          <p className="mt-4 max-w-md text-navy-100">
            Multi-brand profiles, GST-ready tax handling, live A4 previews and
            print-perfect PDF exports.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-navy-100">
          <li>Unlimited invoices and line items</li>
          <li>Separate logo, numbering and payment details per brand</li>
          <li>Customer ledgers with outstanding balances</li>
        </ul>
      </section>

      <section className="flex flex-1 items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">
              You must sign in before creating or downloading invoices.
            </p>
            {params.registered ? (
              <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Account created. Sign in to continue.
              </p>
            ) : null}
            <LoginForm nextPath={params.next ?? "/dashboard"} />
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Need an account?{" "}
            <Link className="font-semibold text-navy-700 hover:underline" href="/register">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
