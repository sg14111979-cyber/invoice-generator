import { notFound } from "next/navigation";
import { InvoicePreview } from "@/components/invoice-preview";
import { requireUser } from "@/lib/auth";
import { getOwnedInvoice, invoiceToView } from "@/lib/invoices";
import { AutoPrint } from "./auto-print";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/invoices/${id}/print`);
  const invoice = await getOwnedInvoice(id, user.id);
  if (!invoice) notFound();

  return (
    <div className="print-area">
      <AutoPrint />
      <InvoicePreview view={invoiceToView(invoice)} />
    </div>
  );
}
