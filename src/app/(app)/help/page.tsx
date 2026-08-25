import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "How to use | Invoice Studio" };

const STEPS = [
  {
    title: "1. Set up your business",
    body: "Open Brands and fill in your business name, logo, address, tax number and bank details. Everything you enter here is filled in automatically on every invoice, so you only do it once. Running two businesses? Add a second brand and switch between them using the picker at the top of the screen.",
    action: { href: "/brands", label: "Go to Brands" },
  },
  {
    title: "2. Save your customers",
    body: "Open Customers and add the people you bill. Once saved, you can pick a customer on an invoice instead of retyping their address every time. Each customer page shows what they have been billed and what they still owe.",
    action: { href: "/customers", label: "Go to Customers" },
  },
  {
    title: "3. Save the things you sell",
    body: "Open Items and add each product or service once: your own code (for example A4-COPY-80), the name, unit, rate, tax rate and HSN/SAC. On an invoice you then type that code or name in \u201cPick a saved item\u201d and the whole line fills itself in, so the same item is billed identically to every customer. Already typed a line by hand? Press \u201cSave as item\u201d on it and it joins the list.",
    action: { href: "/items", label: "Go to Items" },
  },
  {
    title: "4. Create an invoice",
    body: "Click New invoice. The invoice number, date and your business details are filled in for you. Pick a customer, then add a line for each product or service: description, quantity, rate. The preview on the right is exactly what your customer will receive.",
    action: { href: "/invoices/new", label: "Create an invoice" },
  },
  {
    title: "5. Add tax, discount and shipping",
    body: "Choose No tax, one tax rate for the whole invoice, a different rate per line, or GST (CGST/SGST for the same state, IGST for another state). Discounts can be a percentage or a fixed amount. Add shipping if you charge it. The total updates as you type — there is nothing to calculate yourself.",
  },
  {
    title: "6. Save, then send",
    body: "Your work is saved automatically as a draft while you type, and Save invoice stores it for good. Then use PDF to download a file you can email or WhatsApp, or Print for a paper copy. Change the status to Sent, and to Paid once the money arrives.",
  },
  {
    title: "7. Keep track",
    body: "Invoices lists everything you have made, with a search box and filters by customer, status and date. The Dashboard shows how much you have invoiced, how much has been paid and how much is still outstanding. Unpaid invoices past their due date are marked Overdue automatically.",
    action: { href: "/invoices", label: "See all invoices" },
  },
];

const FAQS = [
  {
    q: "Can two items share a code?",
    a: "No \u2014 a code is your unique reference, so the app refuses a code that is already in use and tells you which item has it. Leave the code blank if you would rather search by name only.",
  },
  {
    q: "If I change an item's rate, do old invoices change?",
    a: "No. Each invoice keeps its own copy of the code, description and rate as they were when you made it, so history never changes underneath you.",
  },
  {
    q: "Do I need to be online?",
    a: "No. The app runs on your own computer and your data stays in a file on that computer. Keep a copy of the dev.db file if you want a backup.",
  },
  {
    q: "How do I change my invoice numbers?",
    a: "Brands → edit the brand → Invoice prefix, number format and next number. For example a prefix of ACME with format {PREFIX}-{NUMBER} gives ACME-00001.",
  },
  {
    q: "Can I send a quote or proforma invoice?",
    a: "Yes. Make a normal invoice, leave the status as Draft and write 'Proforma Invoice' in the notes or footer. When the customer accepts it, use Duplicate to turn it into the real invoice with a fresh number.",
  },
  {
    q: "I forgot my password.",
    a: "Ask whoever administers this installation to reset it under Users. If you are the only administrator, re-run setup with ADMIN_EMAIL and ADMIN_PASSWORD set in the .env file to reset your own login.",
  },
  {
    q: "My logo does not appear in the PDF.",
    a: "PDFs support PNG and JPG logos. If yours is an SVG or WEBP, save it as PNG and upload it again in Brands.",
  },
  {
    q: "Can somebody else use the app too?",
    a: "Yes. An administrator can add people under Users. Everyone only ever sees their own brands, customers and invoices.",
  },
];

export default async function HelpPage() {
  await requireUser("/help");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">How to use Invoice Studio</h1>
        <p className="text-sm text-slate-500">
          Six steps from a blank screen to a PDF invoice in your customer&apos;s inbox.
        </p>
      </div>

      <ol className="space-y-3">
        {STEPS.map((step) => (
          <li key={step.title} className="card p-4">
            <h2 className="text-sm font-semibold text-slate-900">{step.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
            {step.action ? (
              <Link className="btn-secondary mt-3 inline-flex" href={step.action.href}>
                {step.action.label}
              </Link>
            ) : null}
          </li>
        ))}
      </ol>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Common questions</h2>
        <dl className="mt-3 space-y-3">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <dt className="text-sm font-medium text-slate-900">{faq.q}</dt>
              <dd className="text-sm leading-relaxed text-slate-600">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
