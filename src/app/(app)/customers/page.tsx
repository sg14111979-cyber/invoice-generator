import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { CustomersManager } from "./customers-manager";

export const metadata = { title: "Customers | Invoice Studio" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser("/customers");
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const activeBrand = await getActiveBrand(user.id);

  const customers = await prisma.customer.findMany({
    where: {
      userId: user.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { companyName: { contains: query } },
              { email: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      invoices: {
        where: { status: { not: "CANCELLED" } },
        select: { total: true, amountPaid: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Saved customers auto-fill the billing details on new invoices.
        </p>
      </div>

      <CustomersManager
        initialQuery={query}
        currency={activeBrand?.settings?.currency ?? "INR"}
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          companyName: customer.companyName,
          addressLine1: customer.addressLine1,
          addressLine2: customer.addressLine2,
          city: customer.city,
          state: customer.state,
          stateCode: customer.stateCode,
          country: customer.country,
          postalCode: customer.postalCode,
          email: customer.email,
          phone: customer.phone,
          taxNumber: customer.taxNumber,
          invoiceCount: customer.invoices.length,
          totalInvoiced: customer.invoices.reduce((sum, invoice) => sum + invoice.total, 0),
          outstanding: customer.invoices.reduce(
            (sum, invoice) => sum + invoice.total - invoice.amountPaid,
            0,
          ),
        }))}
      />
    </div>
  );
}
