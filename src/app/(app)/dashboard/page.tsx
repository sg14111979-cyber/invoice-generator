import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { formatDisplayDate, STATUS_CLASSES, STATUS_LABELS } from "@/lib/format";
import { markOverdueInvoices } from "@/lib/invoices";
import { getDashboardStats } from "@/lib/stats";

export const metadata = { title: "Dashboard | Invoice Studio" };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  await markOverdueInvoices(user.id);
  const activeBrand = await getActiveBrand(user.id);
  const currency = activeBrand?.settings?.currency ?? "INR";

  const [stats, recentInvoices, recentCustomers] = await Promise.all([
    getDashboardStats(user.id, activeBrand?.id ?? null),
    prisma.invoice.findMany({
      where: { userId: user.id, ...(activeBrand ? { brandId: activeBrand.id } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, companyName: true, email: true },
    }),
  ]);

  const countCards = [
    { label: "Total invoices", value: stats.total },
    { label: "Draft", value: stats.draft },
    { label: "Sent", value: stats.sent },
    { label: "Paid", value: stats.paid },
    { label: "Overdue", value: stats.overdue, danger: stats.overdue > 0 },
  ];

  const moneyCards = [
    { label: "Total invoiced", value: stats.totalInvoiced },
    { label: "Total paid", value: stats.totalPaid },
    { label: "Outstanding", value: stats.outstanding },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeBrand
              ? `Figures for ${activeBrand.name}`
              : "Create a brand to start invoicing"}
          </p>
        </div>
        <Link className="btn-primary" href="/invoices/new">
          + New invoice
        </Link>
      </div>

      {!activeBrand ? (
        <div className="card p-6">
          <p className="text-sm text-slate-600">
            You have no brands yet.{" "}
            <Link className="font-semibold text-navy-700 hover:underline" href="/brands">
              Add your first brand
            </Link>{" "}
            to unlock invoicing.
          </p>
        </div>
      ) : null}

      {stats.total === 0 ? (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">New here? Three steps to your first invoice</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Add your business details once under Brands - they appear on every invoice.</li>
            <li>Save the customer you are billing under Customers.</li>
            <li>Click New invoice, add your items, then download the PDF.</li>
          </ol>
          <Link className="btn-secondary mt-3 inline-flex" href="/help">
            Read the how-to guide
          </Link>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {countCards.map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                card.danger ? "text-red-600" : "text-slate-900"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {moneyCards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatMoney(card.value, currency)}
            </p>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Quick actions
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="btn-primary" href="/invoices/new">
            + New invoice
          </Link>
          <Link className="btn-secondary" href="/customers">
            Customers
          </Link>
          <Link className="btn-secondary" href="/brands">
            Brands
          </Link>
          <Link className="btn-secondary" href="/invoices">
            Invoice history
          </Link>
          <Link className="btn-secondary" href="/settings">
            Settings
          </Link>
          <Link className="btn-secondary" href="/help">
            How to use
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent invoices
            </h2>
            <Link className="text-sm font-semibold text-navy-700 hover:underline" href="/invoices">
              View all
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No invoices yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Number</th>
                    <th className="px-5 py-2.5 font-semibold">Customer</th>
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Total</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-navy-700">
                        <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {invoice.customer?.name || invoice.toName || "\u2014"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {formatDisplayDate(invoice.issueDate)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">
                        {formatMoney(invoice.total, invoice.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${STATUS_CLASSES[invoice.status] ?? ""}`}>
                          {STATUS_LABELS[invoice.status] ?? invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent customers
            </h2>
            <Link className="text-sm font-semibold text-navy-700 hover:underline" href="/customers">
              View all
            </Link>
          </div>
          {recentCustomers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No customers yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentCustomers.map((customer) => (
                <li key={customer.id} className="px-5 py-3">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-slate-800 hover:text-navy-700 hover:underline"
                  >
                    {customer.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {customer.companyName || customer.email || "\u2014"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
