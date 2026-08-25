import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand";
import { formatMoney } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/format";
import { recentMovements, stockLevels, summariseStock } from "@/lib/stock";
import { MovementRowActions } from "./movement-row-actions";
import { StockAdjustForm } from "./stock-adjust-form";

export const metadata = { title: "Stock | Invoice Studio" };

const SOURCE_LABELS: Record<string, string> = {
  PURCHASE: "Purchase",
  INVOICE: "Sale",
  ADJUSTMENT: "Adjustment",
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; itemId?: string; low?: string }>;
}) {
  const user = await requireUser("/stock");
  const filters = await searchParams;
  const query = (filters.q ?? "").trim();

  const [activeBrand, levels, allLevels, movements] = await Promise.all([
    getActiveBrand(user.id),
    stockLevels(user.id, query),
    stockLevels(user.id),
    recentMovements(user.id, filters.itemId ?? null, 100),
  ]);

  const currency = activeBrand?.settings?.currency ?? "INR";
  const summary = summariseStock(allLevels);
  const rows = filters.low === "1" ? levels.filter((level) => level.lowStock) : levels;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Stock</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quantities come from your purchase bills (in), invoices (out) and any manual
          adjustments. Drafts and cancelled documents are ignored.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Tracked items" value={String(summary.trackedItems)} />
        <Tile label="Stock value" value={formatMoney(summary.stockValue, currency)} />
        <Tile label="Low stock" value={String(summary.lowStockCount)} tone="warn" />
        <Tile label="Out of stock" value={String(summary.outOfStockCount)} tone="bad" />
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4">
        <label className="block flex-1">
          <span className="label">Search</span>
          <input className="input" name="q" defaultValue={query} placeholder="Item code or name" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="low"
            value="1"
            defaultChecked={filters.low === "1"}
            className="h-4 w-4 rounded border-slate-300"
          />
          Only low stock
        </label>
        <button className="btn-primary" type="submit">
          Apply
        </button>
        <Link href="/stock" className="btn-secondary">
          Reset
        </Link>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Opening</th>
                <th className="px-4 py-3 text-right">Purchased</th>
                <th className="px-4 py-3 text-right">Sold</th>
                <th className="px-4 py-3 text-right">Adjusted</th>
                <th className="px-4 py-3 text-right">On hand</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={9}>
                    No stock-tracked items yet. Turn on &ldquo;Track stock&rdquo; on an item to see
                    it here.
                  </td>
                </tr>
              ) : (
                rows.map((level) => (
                  <tr key={level.itemId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {level.code || "\u2014"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{level.name}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{level.openingStock}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{level.purchasedQty}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{level.soldQty}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{level.adjustedQty}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        level.lowStock ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {level.onHand} {level.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(level.stockValue, currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/stock?itemId=${level.itemId}`}
                        className="text-xs font-semibold text-navy-700 hover:underline"
                      >
                        History
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Adjust stock
        </h2>
        <div className="mt-3">
          <StockAdjustForm
            items={allLevels.map((level) => ({
              id: level.itemId,
              label: level.code ? `${level.code} \u2014 ${level.name}` : level.name,
            }))}
          />
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {filters.itemId ? "Movements for this item" : "Recent movements"}
          </h2>
          {filters.itemId ? (
            <Link href="/stock" className="text-xs font-semibold text-navy-700 hover:underline">
              Show all movements
            </Link>
          ) : null}
        </div>
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit cost</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">
                      {formatDisplayDate(movement.occurredAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {movement.itemCode ? `${movement.itemCode} \u00b7 ` : ""}
                      {movement.itemName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {SOURCE_LABELS[movement.source] ?? movement.source}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {movement.reference || movement.note || "\u2014"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        movement.quantity < 0 ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatMoney(movement.unitCost, currency)}
                    </td>
                    <td className="px-4 py-3">
                      {movement.source === "ADJUSTMENT" ? (
                        <MovementRowActions movementId={movement.id} />
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "bad";
}) {
  const valueClass =
    tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
