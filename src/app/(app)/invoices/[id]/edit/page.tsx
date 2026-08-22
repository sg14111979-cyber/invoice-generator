import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listBrands } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { draftFromInvoice, toBrandOption, toCustomerOption } from "@/lib/invoice-draft";
import { getOwnedInvoice } from "@/lib/invoices";
import { InvoiceEditor } from "../../invoice-editor";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/invoices/${id}/edit`);

  const [invoice, brands, customers] = await Promise.all([
    getOwnedInvoice(id, user.id),
    listBrands(user.id),
    prisma.customer.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!invoice) notFound();

  return (
    <InvoiceEditor
      brands={brands.map(toBrandOption)}
      customers={customers.map(toCustomerOption)}
      initialDraft={draftFromInvoice(invoice)}
      invoiceId={invoice.id}
    />
  );
}
