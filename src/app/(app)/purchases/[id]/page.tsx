import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";
import { formatDisplayDate, STATUS_CLASSES, STATUS_LABELS } from "@/lib/format";
import { getOwnedPurchase } from "@/lib/purchases";
import { stateLabel } from "@/lib/states";
import { PurchaseRowActions } from "../purchase-row-actions";

export const metadata = { title: "Purchase bill | Invoice Studio" };

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/purchases/${id}`);
  const purchase = await getOwnedPurchase(id, user.id);
  if (!purchase) notFound();

  const currency = purchase.currency;
  const isGst = purchase.taxMode === "GST";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Bill {purchase.billNumber}</h1>
          <p className="text-sm text-slate-500">
            {purchase.supplierName || "No supplier"} &middot;{" "}
            {formatDisplayDate(purchase.billDate)}
            {purchase.reference ? ` \u00b7 ref ${purchase.reference}` : ""}
          </p>
          <span className={`badge mt-2 ${STATUS_CLASSES[purchase.status] ?? ""}`}>
            {STATUS_LABELS[purchase.status] ?? purchase.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/purchases" className="btn-secondary">
            Back to purchases
          </Link>
          <PurchaseRowActions purchaseId={purchase.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Supplier</h2>
          <div className="mt-2 space-y-0.5 text-sm text-slate-600">
            <p className="font-medium text-slate-900">{purchase.supplierName || "\u2014"}</p>
            {purchase.supplierCompany ? <p>{purchase.supplierCompany}</p> : null}
            {purchase.supplierAddress ? <p>{purchase.supplierAddress}</p> : null}
            {purchase.supplierEmail ? <p>{purchase.supplierEmail}</p> : null}
            {purchase.supplierPhone ? <p>{purchase.supplierPhone}</p> : null}
            {purchase.supplierTaxNumber ? <p>GSTIN: {purchase.supplierTaxNumber}</p> : null}
            {stateLabel(purchase.supplierStateCode) ? (
              <p>State: {stateLabel(purchase.supplierStateCode)}</p>
            ) : null}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Bill</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <Row label="Brand" value={purchase.brand.name} />
            <Row
              label="Brand state"
              value={stateLabel(purchase.brandStateCode) || "\u2014"}
            />
            <Row label="Due date" value={formatDisplayDate(purchase.dueDate)} />
            <Row label="Currency" value={currency} />
          </dl>
        </section>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500">{item.code || "\u2014"}</td>
                  <td className="px-4 py-3 text-slate-800">{item.description || "\u2014"}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatMoney(item.rate, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatMoney(item.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4">
        <dl className="ml-auto max-w-sm space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(purchase.subtotal, currency)} />
          <Row label="Discount" value={`- ${formatMoney(purchase.discountAmount, currency)}`} />
          <Row label="Taxable" value={formatMoney(purchase.taxableAmount, currency)} />
          <Row
            label={isGst ? `GST (${purchase.cgstRate + purchase.sgstRate + purchase.igstRate}%)` : "Tax"}
            value={formatMoney(purchase.taxAmount, currency)}
          />
          <Row label="Shipping" value={formatMoney(purchase.shippingAmount, currency)} />
          <Row label="Total" value={formatMoney(purchase.total, currency)} strong />
          <Row label="Paid" value={formatMoney(purchase.amountPaid, currency)} />
          <Row label="Balance payable" value={formatMoney(purchase.balanceDue, currency)} strong />
        </dl>
      </section>

      {purchase.notes ? (
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{purchase.notes}</p>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-semibold text-slate-900" : "text-slate-500"}>{label}</dt>
      <dd className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>{value}</dd>
    </div>
  );
}
