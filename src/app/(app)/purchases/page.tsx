import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listBrands } from "@/lib/brand";
import { formatMoney } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { formatDisplayDate, fromDateInputValue, STATUS_CLASSES, STATUS_LABELS } from "@/lib/format";
import { PURCHASE_STATUSES } from "@/lib/schemas";
import { PurchaseRowActions } from "./purchase-row-actions";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Purchases | Invoice Studio" };

interface SearchParams {
  q?: string;
  brandId?: string;
  supplierId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser("/purchases");
  const filters = await searchParams;

  const from = fromDateInputValue(filters.from);
  const to = fromDateInputValue(filters.to);
  const query = filters.q?.trim() ?? "";

  const where: Prisma.PurchaseWhereInput = {
    userId: user.id,
    ...(filters.brandId ? { brandId: filters.brandId } : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(from || to
      ? { billDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
    ...(query
      ? {
          OR: [
            { billNumber: { contains: query } },
            { reference: { contains: query } },
            { supplierName: { contains: query } },
            { supplierCompany: { contains: query } },
          ],
        }
      : {}),
  };

  const [purchases, brands, suppliers, totals] = await Promise.all([
    prisma.purchase.findMany({
      where,
      orderBy: [{ billDate: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { brand: { select: { name: true } } },
    }),
    listBrands(user.id),
    prisma.supplier.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.purchase.aggregate({ where, _sum: { total: true, balanceDue: true }, _count: true }),
  ]);

  const currency = purchases[0]?.currency ?? "INR";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Purchases</h1>
          <p className="text-sm text-slate-500">
            {totals._count} bill(s) &middot; purchased {formatMoney(totals._sum.total ?? 0, currency)}{" "}
            &middot; payable {formatMoney(totals._sum.balanceDue ?? 0, currency)}
          </p>
        </div>
        <Link href="/purchases/new" className="btn-primary">
          New purchase bill
        </Link>
      </div>

      <form className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="block lg:col-span-2">
          <span className="label">Search</span>
          <input
            className="input"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Bill number, supplier or reference"
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
          <span className="label">Supplier</span>
          <select className="input" name="supplierId" defaultValue={filters.supplierId ?? ""}>
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Status</span>
          <select className="input" name="status" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            {PURCHASE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] ?? status}
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
          <Link href="/purchases" className="btn-secondary">
            Reset
          </Link>
        </div>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Bill</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Payable</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                    No purchase bills match these filters yet.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link href={`/purchases/${purchase.id}`} className="hover:underline">
                        {purchase.billNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {purchase.supplierName || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{purchase.brand.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDisplayDate(purchase.billDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_CLASSES[purchase.status] ?? ""}`}>
                        {STATUS_LABELS[purchase.status] ?? purchase.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800">
                      {formatMoney(purchase.total, purchase.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatMoney(purchase.balanceDue, purchase.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <PurchaseRowActions purchaseId={purchase.id} />
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
