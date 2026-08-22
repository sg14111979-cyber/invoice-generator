import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { formatDisplayDate, joinAddress, STATUS_CLASSES, STATUS_LABELS } from "@/lib/format";
import { round2 } from "@/lib/calc";

export const metadata = { title: "Customer | Invoice Studio" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/customers/${id}`);

  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    include: {
      invoices: {
        orderBy: { issueDate: "desc" },
        include: { brand: { select: { name: true } } },
      },
    },
  });
  if (!customer) notFound();

  const active = customer.invoices.filter((invoice) => invoice.status !== "CANCELLED");
  const totalInvoiced = round2(active.reduce((sum, invoice) => sum + invoice.total, 0));
  const totalPaid = round2(active.reduce((sum, invoice) => sum + invoice.amountPaid, 0));
  const currency = active[0]?.currency ?? "INR";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{customer.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{customer.companyName || "\u2014"}</p>
        </div>
        <Link className="btn-secondary" href="/customers">
          Back to customers
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Address</dt>
              <dd className="text-slate-700">
                {joinAddress([
                  customer.addressLine1,
                  customer.addressLine2,
                  customer.city,
                  customer.state,
                  customer.postalCode,
                  customer.country,
                ]) || "\u2014"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt>
              <dd className="text-slate-700">{customer.email || "\u2014"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Phone</dt>
              <dd className="text-slate-700">{customer.phone || "\u2014"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Tax number</dt>
              <dd className="text-slate-700">{customer.taxNumber || "\u2014"}</dd>
            </div>
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Total invoiced
          </h2>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatMoney(totalInvoiced, currency)}
          </p>
          <p className="mt-1 text-sm text-slate-500">{active.length} active invoice(s)</p>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Outstanding balance
          </h2>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatMoney(round2(totalInvoiced - totalPaid), currency)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatMoney(totalPaid, currency)} received
          </p>
        </section>
      </div>

      <section className="card">
        <h2 className="border-b border-slate-200 px-5 py-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Invoice history
        </h2>
        {customer.invoices.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No invoices for this customer yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Number</th>
                  <th className="px-5 py-3 font-semibold">Brand</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customer.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-semibold text-navy-700 hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{invoice.brand.name}</td>
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
    </div>
  );
}
