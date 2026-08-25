import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveBrand, listBrands } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { toItemOption } from "@/lib/invoice-draft";
import { newPurchaseDraft, toSupplierOption } from "@/lib/purchase-draft";
import { toPurchaseBrandOption } from "../brand-option";
import { PurchaseEditor } from "../purchase-editor";

export const metadata = { title: "New purchase bill | Invoice Studio" };

export default async function NewPurchasePage() {
  const user = await requireUser("/purchases/new");
  const [brands, activeBrand, suppliers, items] = await Promise.all([
    listBrands(user.id),
    getActiveBrand(user.id),
    prisma.supplier.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.item.findMany({
      where: { userId: user.id },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!activeBrand) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Add a brand first</h1>
        <p className="mt-2 text-sm text-slate-600">
          Purchase bills are recorded against the business that bought the goods.
        </p>
        <Link href="/brands/new" className="btn-primary mt-4">
          Create a brand
        </Link>
      </div>
    );
  }

  return (
    <PurchaseEditor
      brands={brands.map(toPurchaseBrandOption)}
      suppliers={suppliers.map(toSupplierOption)}
      catalog={items.map(toItemOption)}
      initialDraft={newPurchaseDraft(toPurchaseBrandOption(activeBrand))}
      purchaseId={null}
    />
  );
}
