import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { itemSearchWhere } from "@/lib/items";
import { ItemsManager } from "./items-manager";

export const metadata = { title: "Items | Invoice Studio" };

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser("/items");
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const activeBrand = await getActiveBrand(user.id);

  const items = await prisma.item.findMany({
    where: itemSearchWhere(user.id, query),
    orderBy: [{ code: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Items</h1>
        <p className="mt-1 text-sm text-slate-500">
          Save the products and services you sell once. On an invoice you then pick them by
          code or name and the description, unit, rate and tax fill themselves in.
        </p>
      </div>

      <ItemsManager
        initialQuery={query}
        currency={activeBrand?.settings?.currency ?? "INR"}
        items={items.map((item) => ({
          id: item.id,
          code: item.code ?? "",
          name: item.name,
          description: item.description,
          unit: item.unit,
          rate: item.rate,
          taxRate: item.taxRate,
          hsnCode: item.hsnCode,
          notes: item.notes,
        }))}
      />
    </div>
  );
}
