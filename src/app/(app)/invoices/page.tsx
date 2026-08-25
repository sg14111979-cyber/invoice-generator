import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listBrands } from "@/lib/brand";
import { formatMoney } from "@/lib/currency";
import { prisma } from "@/lib/db";
import {
  formatDisplayDate,
  fromDateInputValue,
  STATUS_CLASSES,
  STATUS_LABELS,
} from "@/lib/format";
import { markOverdueInvoices } from "@/lib/invoices";
import { INVOICE_STATUSES } from "@/lib/schemas";
import { InvoiceRowActions } from "./invoice-row-actions";
import type { Prisma } from "@prisma/client";

interface SearchParams {
  q?: string;
  brandId?: string;
  customerId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser("/invoices");
  const filters = await searchParams;
  await markOverdueInvoices(user.id);

  const from = fromDateInputValue(filters.from);
  const to = fromDateInputValue(filters.to);
  const query = filters.q?.trim() ?? "";

  const where: Prisma.InvoiceWhereInput = {
    userId: user.id,
    ...(filters.brandId ? { brandId: filters.brandId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(from || to
      ? { issueDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
    ...(query
      ? {
          OR: [
            { invoiceNumber: { contains: query } },
            { toName: { contains: query } },
            { toCompany: { contains: query } },
            { poNumber: { contains: query } },
          ],
        }
      : {}),
  };

  const [invoices, brands, customers, totals] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { brand: { select: { name: true } } },
    }),
    listBrands(user.id),
    prisma.customer.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.invoice.aggregate({ where, _sum: { total: true, balanceDue: true }, _count: true }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">
            {totals._count} invoice(s) &middot; billed{" "}
            {formatMoney(totals._sum.total ?? 0, invoices[0]?.currency ?? "INR")} &middot;
            outstanding {formatMoney(totals._sum.balanceDue ?? 0, invoices[0]?.currency ?? "INR")}
          </p>
        </div>
        <Link href="/invoices/new" className="btn-primary">
          New invoice
        </Link>
      </div>

      <form className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="block lg:col-span-2">
          <span className="label">Search</span>
          <input
            className="input"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Number, customer or PO"
          />
        </label>
        <label className="block">
          <span className="label">Brand</span>
          <select className="input" name="brandId" defaultValue={filters.brandId ?? ""}>
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Customer</span>
          <select className="input" name="customerId" defaultValue={filters.customerId ?? ""}>
            <option value="">All customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Status</span>
          <select className="input" name="status" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">From</span>
            <input className="input" type="date" name="from" defaultValue={filters.from ?? ""} />
          </label>
          <label className="block">
            <span className="label">To</span>
            <input className="input" type="date" name="to" defaultValue={filters.to ?? ""} />
          </label>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="btn-primary">
            Apply filters
          </button>
          <Link href="/invoices" className="btn-secondary">
            Reset
          </Link>
        </div>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={9}>
                    No invoices match these filters yet.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{invoice.toName || "\u2014"}</td>
                    <td className="px-4 py-3 text-slate-500">{invoice.brand.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDisplayDate(invoice.issueDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDisplayDate(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_CLASSES[invoice.status] ?? ""}`}>
                        {STATUS_LABELS[invoice.status] ?? invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800">
                      {formatMoney(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatMoney(invoice.balanceDue, invoice.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceRowActions invoiceId={invoice.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
