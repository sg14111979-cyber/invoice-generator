import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getOwnedInvoice, invoiceToView } from "@/lib/invoices";
import { InvoiceDocument, type PdfLogo } from "@/lib/pdf/invoice-document";

type Params = { params: Promise<{ id: string }> };

/**
 * Loads a stored logo for embedding. Only raster formats the PDF renderer
 * supports are used; SVG/WEBP logos are skipped rather than breaking the file.
 */
async function loadLogo(logoPath: string | null): Promise<PdfLogo | null> {
  if (!logoPath || !logoPath.startsWith("/uploads/")) return null;

  const extension = path.extname(logoPath).toLowerCase();
  const format: PdfLogo["format"] | null =
    extension === ".png" ? "png" : extension === ".jpg" || extension === ".jpeg" ? "jpg" : null;
  if (!format) return null;

  try {
    const absolute = path.join(process.cwd(), "public", logoPath.replace(/^\//, ""));
    return { data: await readFile(absolute), format };
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Authentication required");

  const { id } = await params;
  const invoice = await getOwnedInvoice(id, user.id);
  if (!invoice) return jsonError(404, "Invoice not found");

  const view = invoiceToView(invoice);
  const logo = await loadLogo(invoice.fromLogoPath);
  const buffer = await renderToBuffer(<InvoiceDocument view={view} logo={logo} />);

  const download = new URL(request.url).searchParams.get("download") === "1";
  const safeNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9._-]/g, "-");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="invoice-${safeNumber}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
