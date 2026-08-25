import { prisma } from "@/lib/db";

/**
 * Expands a brand's number format. Supported tokens: {PREFIX}, {NUMBER},
 * {YEAR}, {YY}, {MONTH}.
 */
export function formatInvoiceNumber(
  format: string,
  prefix: string,
  sequence: number,
  padding: number,
  date = new Date(),
): string {
  const number = String(Math.max(1, sequence)).padStart(Math.max(1, padding), "0");
  const year = String(date.getFullYear());
  return (format && format.trim() ? format : "{PREFIX}-{NUMBER}")
    .replaceAll("{PREFIX}", prefix)
    .replaceAll("{NUMBER}", number)
    .replaceAll("{YEAR}", year)
    .replaceAll("{YY}", year.slice(-2))
    .replaceAll("{MONTH}", String(date.getMonth() + 1).padStart(2, "0"));
}

/**
 * Reserves the next invoice number for a brand, skipping values already taken by
 * manually numbered invoices.
 */
export async function reserveInvoiceNumber(
  userId: string,
  brandId: string,
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const settings = await tx.brandSettings.findUnique({ where: { brandId } });
    if (!settings) throw new Error("Brand settings missing");

    let sequence = settings.nextNumber;
    let candidate = formatInvoiceNumber(
      settings.numberFormat,
      settings.invoicePrefix,
      sequence,
      settings.numberPadding,
    );

    // Guard against collisions with numbers a user typed in by hand.
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const clash = await tx.invoice.findFirst({
        where: { userId, invoiceNumber: candidate },
        select: { id: true },
      });
      if (!clash) break;
      sequence += 1;
      candidate = formatInvoiceNumber(
        settings.numberFormat,
        settings.invoicePrefix,
        sequence,
        settings.numberPadding,
      );
    }

    await tx.brandSettings.update({
      where: { brandId },
      data: { nextNumber: sequence + 1 },
    });

    return candidate;
  });
}

export async function previewNextInvoiceNumber(brandId: string): Promise<string> {
  const settings = await prisma.brandSettings.findUnique({ where: { brandId } });
  if (!settings) return "";
  return formatInvoiceNumber(
    settings.numberFormat,
    settings.invoicePrefix,
    settings.nextNumber,
    settings.numberPadding,
  );
}
