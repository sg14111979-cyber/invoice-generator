import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoicePreview } from "@/components/invoice-preview";
import { requireUser } from "@/lib/auth";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/format";
import { getOwnedInvoice, invoiceToView } from "@/lib/invoices";
import { InvoiceViewActions } from "./invoice-view-actions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/invoices/${id}`);
  const invoice = await getOwnedInvoice(id, user.id);
  if (!invoice) notFound();

  const view = invoiceToView(invoice);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{invoice.invoiceNumber}</h1>
            <span className={`badge ${STATUS_CLASSES[invoice.status] ?? ""}`}>
              {STATUS_LABELS[invoice.status] ?? invoice.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {invoice.brand.name}
            {invoice.toName ? ` \u2192 ${invoice.toName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/invoices" className="btn-secondary">
            Back
          </Link>
          <Link href={`/invoices/${invoice.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <InvoiceViewActions invoiceId={invoice.id} />
        </div>
      </div>

      <div className="print-area">
        <InvoicePreview view={view} />
      </div>
    </div>
  );
}
