import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Welcome | Invoice Studio" };

export default async function SetupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg">
        <div className="card p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-600">
            Invoice Studio
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Welcome — let&apos;s set up</h1>
          <p className="mt-1 text-sm text-slate-500">
            Three details and you&apos;re ready to send invoices. You can change all of it later
            in Settings.
          </p>
          <SetupForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          This screen only appears once, on a brand-new installation.
        </p>
      </div>
    </main>
  );
}
