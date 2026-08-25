import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/format";
import { hasPaymentDetails, type InvoiceView } from "@/lib/invoice-view";

export interface PdfLogo {
  data: Buffer;
  format: "png" | "jpg";
}

const ACCENTS: Record<InvoiceView["template"], string> = {
  modern: "#1e3a5f",
  corporate: "#1f2937",
  classic: "#111827",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 32,
    fontSize: 9,
    color: "#1f2937",
    fontFamily: "Helvetica",
  },
  row: { flexDirection: "row" },
  spaceBetween: { flexDirection: "row", justifyContent: "space-between" },
  logo: { maxHeight: 56, maxWidth: 150, marginBottom: 8, objectFit: "contain" },
  businessName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  muted: { color: "#4b5563", lineHeight: 1.5 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  metaLabel: { color: "#6b7280", marginRight: 8 },
  metaValue: { fontFamily: "Helvetica-Bold" },
  sectionLabel: {
    fontSize: 7,
    letterSpacing: 1,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  tableHeader: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4 },
  tableHeaderText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 8 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  box: {
    marginTop: 16,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 8,
  },
  pageNumber: { textAlign: "center", color: "#9ca3af", fontSize: 7, marginTop: 4 },
});

const COLUMNS = {
  description: { flex: 4 },
  qty: { flex: 1, textAlign: "right" as const },
  unit: { flex: 1 },
  rate: { flex: 1.4, textAlign: "right" as const },
  tax: { flex: 1, textAlign: "right" as const },
  discount: { flex: 1, textAlign: "right" as const },
  amount: { flex: 1.6, textAlign: "right" as const },
};

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const font = bold ? { fontFamily: "Helvetica-Bold" } : {};
  return (
    <View style={styles.totalsRow}>
      <Text style={{ color: bold ? "#111827" : "#4b5563", ...font }}>{label}</Text>
      <Text style={font}>{value}</Text>
    </View>
  );
}

/**
 * A4 PDF rendering of an invoice. Totals come from the shared calculator, so the
 * PDF can never disagree with the on-screen preview.
 */
export function InvoiceDocument({ view, logo }: { view: InvoiceView; logo: PdfLogo | null }) {
  const accent = ACCENTS[view.template];
  const { totals } = view;
  const isGst = view.taxMode === "GST";
  const showTaxColumn = !isGst && view.taxMode !== "NONE";

  return (
    <Document title={`Invoice ${view.invoiceNumber}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.spaceBetween}>
          <View style={{ maxWidth: "55%" }}>
            {logo ? <Image style={styles.logo} src={{ data: logo.data, format: logo.format }} /> : null}
            <Text style={styles.businessName}>{view.fromName || "Your business"}</Text>
            {view.fromAddress ? <Text style={styles.muted}>{view.fromAddress}</Text> : null}
            {view.fromPhone ? <Text style={styles.muted}>{view.fromPhone}</Text> : null}
            {view.fromEmail ? <Text style={styles.muted}>{view.fromEmail}</Text> : null}
            {view.fromWebsite ? <Text style={styles.muted}>{view.fromWebsite}</Text> : null}
            {view.fromTaxNumber ? (
              <Text style={styles.muted}>Tax No: {view.fromTaxNumber}</Text>
            ) : null}
            {view.fromRegistration ? (
              <Text style={styles.muted}>Reg No: {view.fromRegistration}</Text>
            ) : null}
          </View>

          <View style={{ maxWidth: "40%" }}>
            <Text style={{ ...styles.title, color: accent }}>INVOICE</Text>
            <Text style={{ textAlign: "right", fontFamily: "Helvetica-Bold", marginTop: 4 }}>
              {view.invoiceNumber}
            </Text>
            <Meta label="Invoice date" value={formatDisplayDate(view.issueDate)} />
            <Meta label="Due date" value={formatDisplayDate(view.dueDate)} />
            {view.paymentTerms ? <Meta label="Terms" value={view.paymentTerms} /> : null}
            {view.poNumber ? <Meta label="PO / Reference" value={view.poNumber} /> : null}
          </View>
        </View>

        <View style={{ ...styles.spaceBetween, marginTop: 20 }}>
          <View style={{ maxWidth: "55%" }}>
            <Text style={styles.sectionLabel}>BILL TO</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{view.toName || "\u2014"}</Text>
            {view.toCompany ? <Text style={styles.muted}>{view.toCompany}</Text> : null}
            {view.toAddress ? <Text style={styles.muted}>{view.toAddress}</Text> : null}
            {view.toEmail ? <Text style={styles.muted}>{view.toEmail}</Text> : null}
            {view.toPhone ? <Text style={styles.muted}>{view.toPhone}</Text> : null}
            {view.toTaxNumber ? <Text style={styles.muted}>Tax No: {view.toTaxNumber}</Text> : null}
          </View>
          <View>
            <Text style={{ ...styles.sectionLabel, textAlign: "right" }}>BALANCE DUE</Text>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right" }}>
              {formatMoney(totals.balanceDue, view.currency)}
            </Text>
          </View>
        </View>

        {/* `fixed` repeats the header on every page of a long invoice. */}
        <View style={{ ...styles.tableHeader, backgroundColor: accent, marginTop: 20 }} fixed>
          <Text style={{ ...styles.tableHeaderText, ...COLUMNS.description }}>Description</Text>
          <Text style={{ ...styles.tableHeaderText, ...COLUMNS.qty }}>Qty</Text>
          <Text style={{ ...styles.tableHeaderText, ...COLUMNS.unit }}>Unit</Text>
          <Text style={{ ...styles.tableHeaderText, ...COLUMNS.rate }}>Rate</Text>
          {showTaxColumn ? (
            <Text style={{ ...styles.tableHeaderText, ...COLUMNS.tax }}>Tax</Text>
          ) : null}
          <Text style={{ ...styles.tableHeaderText, ...COLUMNS.discount }}>Disc</Text>
          <Text style={{ ...styles.tableHeaderText, ...COLUMNS.amount }}>Amount</Text>
        </View>

        {view.items.map((item, index) => (
          <View key={index} style={styles.tableRow} wrap={false}>
            <Text style={COLUMNS.description}>
              {item.code ? `[${item.code}] ` : ""}
              {item.description || "Item"}
            </Text>
            <Text style={COLUMNS.qty}>{item.quantity}</Text>
            <Text style={COLUMNS.unit}>{item.unit || "\u2014"}</Text>
            <Text style={COLUMNS.rate}>{formatMoney(item.rate, view.currency)}</Text>
            {showTaxColumn ? (
              <Text style={COLUMNS.tax}>
                {(item.taxRate || view.taxRate) > 0
                  ? `${item.taxRate || view.taxRate}%`
                  : "\u2014"}
              </Text>
            ) : null}
            <Text style={COLUMNS.discount}>
              {item.discountRate > 0 ? `${item.discountRate}%` : "\u2014"}
            </Text>
            <Text style={{ ...COLUMNS.amount, fontFamily: "Helvetica-Bold" }}>
              {formatMoney(totals.lines[index]?.net ?? 0, view.currency)}
            </Text>
          </View>
        ))}

        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }} wrap={false}>
          <View style={{ width: "50%" }}>
            <TotalRow label="Subtotal" value={formatMoney(totals.subtotal, view.currency)} />
            {totals.discountAmount > 0 ? (
              <TotalRow
                label={
                  view.discountType === "PERCENT" ? `Discount (${view.discountValue}%)` : "Discount"
                }
                value={`- ${formatMoney(totals.discountAmount, view.currency)}`}
              />
            ) : null}
            {view.taxMode !== "NONE" ? (
              <TotalRow
                label="Taxable amount"
                value={formatMoney(totals.taxableAmount, view.currency)}
              />
            ) : null}
            {isGst ? (
              <>
                {view.cgstRate > 0 ? (
                  <TotalRow
                    label={`CGST (${view.cgstRate}%)`}
                    value={formatMoney(totals.cgstAmount, view.currency)}
                  />
                ) : null}
                {view.sgstRate > 0 ? (
                  <TotalRow
                    label={`SGST (${view.sgstRate}%)`}
                    value={formatMoney(totals.sgstAmount, view.currency)}
                  />
                ) : null}
                {view.igstRate > 0 ? (
                  <TotalRow
                    label={`IGST (${view.igstRate}%)`}
                    value={formatMoney(totals.igstAmount, view.currency)}
                  />
                ) : null}
              </>
            ) : view.taxMode === "SINGLE" ? (
              <TotalRow label="Tax" value={formatMoney(totals.taxAmount, view.currency)} />
            ) : null}
            {totals.shippingAmount > 0 ? (
              <TotalRow
                label={view.shippingDescription || "Shipping"}
                value={formatMoney(totals.shippingAmount, view.currency)}
              />
            ) : null}
            <TotalRow label="Total" value={formatMoney(totals.total, view.currency)} bold />
            {totals.amountPaid > 0 ? (
              <TotalRow
                label="Amount paid"
                value={`- ${formatMoney(totals.amountPaid, view.currency)}`}
              />
            ) : null}
            <TotalRow
              label="Balance due"
              value={formatMoney(totals.balanceDue, view.currency)}
              bold
            />
          </View>
        </View>

        {hasPaymentDetails(view) ? (
          <View style={styles.box} wrap={false}>
            <Text style={styles.sectionLabel}>PAYMENT INFORMATION</Text>
            {view.bankName ? <Text style={styles.muted}>Bank: {view.bankName}</Text> : null}
            {view.accountName ? (
              <Text style={styles.muted}>Account name: {view.accountName}</Text>
            ) : null}
            {view.accountNumber ? (
              <Text style={styles.muted}>Account number: {view.accountNumber}</Text>
            ) : null}
            {view.ifsc ? <Text style={styles.muted}>IFSC: {view.ifsc}</Text> : null}
            {view.swift ? <Text style={styles.muted}>SWIFT: {view.swift}</Text> : null}
            {view.upiId ? <Text style={styles.muted}>UPI: {view.upiId}</Text> : null}
            {view.paymentLink ? (
              <Text style={styles.muted}>Pay online: {view.paymentLink}</Text>
            ) : null}
            {view.paymentInstructions ? (
              <Text style={{ ...styles.muted, marginTop: 4 }}>{view.paymentInstructions}</Text>
            ) : null}
          </View>
        ) : null}

        {view.notes ? (
          <View style={{ marginTop: 14 }} wrap={false}>
            <Text style={styles.sectionLabel}>NOTES</Text>
            <Text style={styles.muted}>{view.notes}</Text>
          </View>
        ) : null}

        {view.terms ? (
          <View style={{ marginTop: 12 }} wrap={false}>
            <Text style={styles.sectionLabel}>TERMS &amp; CONDITIONS</Text>
            <Text style={styles.muted}>{view.terms}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          {view.footer ? <Text>{view.footer}</Text> : null}
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
