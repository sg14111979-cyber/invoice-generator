import { formatMoney } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/format";
import { hasPaymentDetails, type InvoiceView } from "@/lib/invoice-view";

interface TemplateSkin {
  accentBar: string;
  headerRow: string;
  headerText: string;
  titleClass: string;
  totalRow: string;
  sectionTitle: string;
}

const SKINS: Record<InvoiceView["template"], TemplateSkin> = {
  modern: {
    accentBar: "h-2 bg-navy-700",
    headerRow: "bg-navy-700",
    headerText: "text-white",
    titleClass: "text-3xl font-semibold tracking-tight text-navy-800",
    totalRow: "bg-navy-50 text-navy-900",
    sectionTitle: "text-[11px] font-bold uppercase tracking-widest text-navy-600",
  },
  corporate: {
    accentBar: "h-0",
    headerRow: "bg-slate-800",
    headerText: "text-white",
    titleClass: "text-2xl font-bold uppercase tracking-[0.2em] text-slate-800",
    totalRow: "bg-slate-100 text-slate-900",
    sectionTitle: "text-[11px] font-bold uppercase tracking-widest text-slate-500",
  },
  classic: {
    accentBar: "h-0",
    headerRow: "border-y-2 border-slate-800 bg-white",
    headerText: "text-slate-900",
    titleClass: "text-3xl font-serif font-bold text-slate-900",
    totalRow: "border-t-2 border-slate-800 bg-white text-slate-900",
    sectionTitle: "text-[11px] font-bold uppercase tracking-widest text-slate-600",
  },
};

function Row({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between gap-6 px-3 py-1.5 text-sm ${className ?? ""}`}>
      <span className={strong ? "font-semibold" : "text-slate-600"}>{label}</span>
      <span className={strong ? "font-semibold" : "text-slate-800"}>{value}</span>
    </div>
  );
}

/**
 * A4-proportioned invoice sheet. Used for the live editor preview, the invoice
 * view page and the print view, so what the user sees is what gets printed.
 */
export function InvoicePreview({ view }: { view: InvoiceView }) {
  const skin = SKINS[view.template];
  const { totals } = view;
  const isGst = view.taxMode === "GST";
  const showPayment = hasPaymentDetails(view);

  return (
    <div className="invoice-sheet mx-auto w-full max-w-[820px] bg-white text-slate-800 shadow-sm ring-1 ring-slate-200">
      <div className={skin.accentBar} />

      <div className="p-8">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            {view.logoPath ? (
              // Plain img: the same markup is used for print and must not depend
              // on the Next image optimizer.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={view.logoPath}
                alt={`${view.fromName || "Business"} logo`}
                className="mb-3 max-h-20 max-w-[220px] object-contain"
              />
            ) : null}
            <p className="text-lg font-semibold text-slate-900">{view.fromName || "Your business"}</p>
            {view.fromAddress ? (
              <p className="mt-1 max-w-xs whitespace-pre-line text-sm text-slate-600">
                {view.fromAddress}
              </p>
            ) : null}
            <div className="mt-1 space-y-0.5 text-sm text-slate-600">
              {view.fromPhone ? <p>{view.fromPhone}</p> : null}
              {view.fromEmail ? <p>{view.fromEmail}</p> : null}
              {view.fromWebsite ? <p>{view.fromWebsite}</p> : null}
              {view.fromTaxNumber ? <p>Tax No: {view.fromTaxNumber}</p> : null}
              {view.fromRegistration ? <p>Reg No: {view.fromRegistration}</p> : null}
            </div>
          </div>

          <div className="text-right">
            <h1 className={skin.titleClass}>INVOICE</h1>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {view.invoiceNumber || "\u2014"}
            </p>
            <dl className="mt-3 space-y-1 text-sm text-slate-600">
              <div className="flex justify-end gap-3">
                <dt>Invoice date</dt>
                <dd className="font-medium text-slate-800">{formatDisplayDate(view.issueDate)}</dd>
              </div>
              <div className="flex justify-end gap-3">
                <dt>Due date</dt>
                <dd className="font-medium text-slate-800">{formatDisplayDate(view.dueDate)}</dd>
              </div>
              {view.paymentTerms ? (
                <div className="flex justify-end gap-3">
                  <dt>Terms</dt>
                  <dd className="font-medium text-slate-800">{view.paymentTerms}</dd>
                </div>
              ) : null}
              {view.poNumber ? (
                <div className="flex justify-end gap-3">
                  <dt>PO / Reference</dt>
                  <dd className="font-medium text-slate-800">{view.poNumber}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className={skin.sectionTitle}>Bill to</p>
            <p className="mt-2 font-semibold text-slate-900">{view.toName || "\u2014"}</p>
            {view.toCompany ? <p className="text-sm text-slate-700">{view.toCompany}</p> : null}
            {view.toAddress ? (
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{view.toAddress}</p>
            ) : null}
            <div className="mt-1 space-y-0.5 text-sm text-slate-600">
              {view.toEmail ? <p>{view.toEmail}</p> : null}
              {view.toPhone ? <p>{view.toPhone}</p> : null}
              {view.toTaxNumber ? <p>Tax No: {view.toTaxNumber}</p> : null}
            </div>
          </div>

          <div className="sm:text-right">
            <p className={skin.sectionTitle}>Balance due</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatMoney(totals.balanceDue, view.currency)}
            </p>
          </div>
        </section>

        <table className="invoice-items mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className={skin.headerRow}>
              <th className={`px-3 py-2.5 text-left font-semibold ${skin.headerText}`}>
                Description
              </th>
              <th className={`px-3 py-2.5 text-right font-semibold ${skin.headerText}`}>Qty</th>
              <th className={`px-3 py-2.5 text-left font-semibold ${skin.headerText}`}>Unit</th>
              <th className={`px-3 py-2.5 text-right font-semibold ${skin.headerText}`}>Rate</th>
              {!isGst && view.taxMode !== "NONE" ? (
                <th className={`px-3 py-2.5 text-right font-semibold ${skin.headerText}`}>Tax</th>
              ) : null}
              <th className={`px-3 py-2.5 text-right font-semibold ${skin.headerText}`}>Disc</th>
              <th className={`px-3 py-2.5 text-right font-semibold ${skin.headerText}`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {view.items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-400" colSpan={7}>
                  No line items yet
                </td>
              </tr>
            ) : (
              view.items.map((item, index) => (
                <tr key={index} className="border-b border-slate-200 align-top">
                  <td className="px-3 py-2.5 text-slate-800">
                    {item.description || <span className="text-slate-400">Item</span>}
                    {item.code ? (
                      <span className="mt-0.5 block font-mono text-[10px] uppercase text-slate-500">
                        {item.code}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-slate-700">{item.unit || "\u2014"}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {formatMoney(item.rate, view.currency)}
                  </td>
                  {!isGst && view.taxMode !== "NONE" ? (
                    <td className="px-3 py-2.5 text-right text-slate-700">
                      {(item.taxRate || view.taxRate) > 0
                        ? `${item.taxRate || view.taxRate}%`
                        : "\u2014"}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {item.discountRate > 0 ? `${item.discountRate}%` : "\u2014"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                    {formatMoney(totals.lines[index]?.net ?? 0, view.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <section className="mt-6 flex justify-end">
          <div className="w-full max-w-sm avoid-break">
            <Row label="Subtotal" value={formatMoney(totals.subtotal, view.currency)} />
            {totals.discountAmount > 0 ? (
              <Row
                label={
                  view.discountType === "PERCENT"
                    ? `Discount (${view.discountValue}%)`
                    : "Discount"
                }
                value={`- ${formatMoney(totals.discountAmount, view.currency)}`}
              />
            ) : null}
            {view.taxMode !== "NONE" ? (
              <Row label="Taxable amount" value={formatMoney(totals.taxableAmount, view.currency)} />
            ) : null}
            {isGst ? (
              <>
                {view.cgstRate > 0 ? (
                  <Row
                    label={`CGST (${view.cgstRate}%)`}
                    value={formatMoney(totals.cgstAmount, view.currency)}
                  />
                ) : null}
                {view.sgstRate > 0 ? (
                  <Row
                    label={`SGST (${view.sgstRate}%)`}
                    value={formatMoney(totals.sgstAmount, view.currency)}
                  />
                ) : null}
                {view.igstRate > 0 ? (
                  <Row
                    label={`IGST (${view.igstRate}%)`}
                    value={formatMoney(totals.igstAmount, view.currency)}
                  />
                ) : null}
              </>
            ) : view.taxMode === "SINGLE" ? (
              <Row label="Tax" value={formatMoney(totals.taxAmount, view.currency)} />
            ) : null}
            {totals.shippingAmount > 0 ? (
              <Row
                label={view.shippingDescription || "Shipping"}
                value={formatMoney(totals.shippingAmount, view.currency)}
              />
            ) : null}
            <Row
              label="Total"
              value={formatMoney(totals.total, view.currency)}
              strong
              className={`mt-1 rounded ${skin.totalRow}`}
            />
            {totals.amountPaid > 0 ? (
              <Row
                label="Amount paid"
                value={`- ${formatMoney(totals.amountPaid, view.currency)}`}
              />
            ) : null}
            <Row
              label="Balance due"
              value={formatMoney(totals.balanceDue, view.currency)}
              strong
              className="border-t border-slate-300"
            />
          </div>
        </section>

        {showPayment ? (
          <section className="mt-8 avoid-break rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className={skin.sectionTitle}>Payment information</p>
            <div className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
              {view.bankName ? <p>Bank: {view.bankName}</p> : null}
              {view.accountName ? <p>Account name: {view.accountName}</p> : null}
              {view.accountNumber ? <p>Account number: {view.accountNumber}</p> : null}
              {view.ifsc ? <p>IFSC: {view.ifsc}</p> : null}
              {view.swift ? <p>SWIFT: {view.swift}</p> : null}
              {view.upiId ? <p>UPI: {view.upiId}</p> : null}
              {view.paymentLink ? <p className="sm:col-span-2">Pay online: {view.paymentLink}</p> : null}
            </div>
            {view.paymentInstructions ? (
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                {view.paymentInstructions}
              </p>
            ) : null}
          </section>
        ) : null}

        {view.notes || view.terms ? (
          <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {view.notes ? (
              <div className="avoid-break">
                <p className={skin.sectionTitle}>Notes</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{view.notes}</p>
              </div>
            ) : null}
            {view.terms ? (
              <div className="avoid-break">
                <p className={skin.sectionTitle}>Terms &amp; conditions</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{view.terms}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {view.footer ? (
          <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
            {view.footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
