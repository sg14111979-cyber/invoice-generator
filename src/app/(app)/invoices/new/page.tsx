import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveBrand, listBrands } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { newInvoiceDraft, toBrandOption, toCustomerOption } from "@/lib/invoice-draft";
import { previewNextInvoiceNumber } from "@/lib/numbering";
import { InvoiceEditor } from "../invoice-editor";

export default async function NewInvoicePage() {
  const user = await requireUser("/invoices/new");
  const [brands, activeBrand, customers] = await Promise.all([
    listBrands(user.id),
    getActiveBrand(user.id),
    prisma.customer.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  if (!activeBrand) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Add a brand first</h1>
        <p className="mt-2 text-sm text-slate-600">
          Invoices are issued under a brand, so create one to set your business details, logo and
          numbering.
        </p>
        <Link href="/brands/new" className="btn-primary mt-4">
          Create a brand
        </Link>
      </div>
    );
  }

  const brandOption = toBrandOption(activeBrand);
  const invoiceNumber = await previewNextInvoiceNumber(activeBrand.id);

  return (
    <InvoiceEditor
      brands={brands.map(toBrandOption)}
      customers={customers.map(toCustomerOption)}
      initialDraft={newInvoiceDraft(brandOption, invoiceNumber)}
      invoiceId={null}
    />
  );
}
