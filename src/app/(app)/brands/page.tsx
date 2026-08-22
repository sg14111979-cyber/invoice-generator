import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listBrands } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { BrandsGrid } from "./brands-grid";

export const metadata = { title: "Brands | Invoice Studio" };

export default async function BrandsPage() {
  const user = await requireUser("/brands");
  const brands = await listBrands(user.id);

  const counts = await prisma.invoice.groupBy({
    by: ["brandId"],
    where: { userId: user.id },
    _count: { _all: true },
  });
  const invoiceCounts = Object.fromEntries(
    counts.map((row) => [row.brandId, row._count._all]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Brands</h1>
          <p className="mt-1 text-sm text-slate-500">
            Each brand keeps its own logo, numbering, tax defaults and payment details.
          </p>
        </div>
        <Link className="btn-primary" href="/brands/new">
          + Add brand
        </Link>
      </div>

      <BrandsGrid
        brands={brands.map((brand) => ({
          id: brand.id,
          name: brand.name,
          logoPath: brand.logoPath,
          email: brand.email,
          phone: brand.phone,
          taxNumber: brand.taxNumber,
          isDefault: brand.isDefault,
          currency: brand.settings?.currency ?? "INR",
          invoiceCount: invoiceCounts[brand.id] ?? 0,
        }))}
      />
    </div>
  );
}
