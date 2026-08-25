import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { SuppliersManager } from "./suppliers-manager";

export const metadata = { title: "Suppliers | Invoice Studio" };

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser("/suppliers");
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const activeBrand = await getActiveBrand(user.id);

  const suppliers = await prisma.supplier.findMany({
    where: {
      userId: user.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { companyName: { contains: query } },
              { taxNumber: { contains: query } },
              { email: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      purchases: {
        where: { status: { not: "CANCELLED" } },
        select: { total: true, amountPaid: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vendors you buy from. Saved suppliers auto-fill purchase bills.
        </p>
      </div>

      <SuppliersManager
        initialQuery={query}
        currency={activeBrand?.settings?.currency ?? "INR"}
        suppliers={suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          companyName: supplier.companyName,
          addressLine1: supplier.addressLine1,
          addressLine2: supplier.addressLine2,
          city: supplier.city,
          state: supplier.state,
          stateCode: supplier.stateCode,
          country: supplier.country,
          postalCode: supplier.postalCode,
          email: supplier.email,
          phone: supplier.phone,
          taxNumber: supplier.taxNumber,
          notes: supplier.notes,
          billCount: supplier.purchases.length,
          totalPurchased: supplier.purchases.reduce((sum, bill) => sum + bill.total, 0),
          outstanding: supplier.purchases.reduce(
            (sum, bill) => sum + bill.total - bill.amountPaid,
            0,
          ),
        }))}
      />
    </div>
  );
}
