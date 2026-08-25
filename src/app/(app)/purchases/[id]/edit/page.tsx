import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listBrands } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { toItemOption } from "@/lib/invoice-draft";
import { draftFromPurchase, toSupplierOption } from "@/lib/purchase-draft";
import { getOwnedPurchase } from "@/lib/purchases";
import { toPurchaseBrandOption } from "../../brand-option";
import { PurchaseEditor } from "../../purchase-editor";

export const metadata = { title: "Edit purchase bill | Invoice Studio" };

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/purchases/${id}/edit`);
  const purchase = await getOwnedPurchase(id, user.id);
  if (!purchase) notFound();

  const [brands, suppliers, items] = await Promise.all([
    listBrands(user.id),
    prisma.supplier.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.item.findMany({
      where: { userId: user.id },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <PurchaseEditor
      brands={brands.map(toPurchaseBrandOption)}
      suppliers={suppliers.map(toSupplierOption)}
      catalog={items.map(toItemOption)}
      initialDraft={draftFromPurchase(purchase)}
      purchaseId={purchase.id}
    />
  );
}
