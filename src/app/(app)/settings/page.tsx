import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listBrands } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const user = await requireUser("/settings");

  const [settings, brands, sessionCount] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
    listBrands(user.id),
    prisma.session.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Account defaults used for new invoices. Brand-specific numbering, tax and payment details
          live in <Link href="/brands" className="font-semibold text-navy-700 hover:underline">
            brand settings
          </Link>
          .
        </p>
      </div>

      <SettingsTabs
        profile={{ name: user.name, email: user.email }}
        preferences={{
          defaultCurrency: settings?.defaultCurrency ?? "INR",
          defaultPaymentTerms: settings?.defaultPaymentTerms ?? "Net 15",
          defaultNotes: settings?.defaultNotes ?? "",
          defaultFooter: settings?.defaultFooter ?? "",
          paperSize: (settings?.paperSize ?? "A4") as "A4" | "Letter",
          logoPosition: (settings?.logoPosition ?? "left") as "left" | "right",
          fontSize: (settings?.fontSize ?? "normal") as "compact" | "normal" | "large",
          defaultTemplate: (settings?.defaultTemplate ?? "modern") as
            | "modern"
            | "corporate"
            | "classic",
        }}
        brands={brands.map((brand) => ({
          id: brand.id,
          name: brand.name,
          currency: brand.settings?.currency ?? "INR",
          taxMode: brand.settings?.taxMode ?? "SINGLE",
          gstEnabled: brand.settings?.gstEnabled ?? false,
          defaultTaxRate: brand.settings?.defaultTaxRate ?? 0,
          cgstRate: brand.settings?.cgstRate ?? 0,
          sgstRate: brand.settings?.sgstRate ?? 0,
          igstRate: brand.settings?.igstRate ?? 0,
          numberFormat: brand.settings?.numberFormat ?? "{PREFIX}-{NUMBER}",
          invoicePrefix: brand.settings?.invoicePrefix ?? "INV",
          nextNumber: brand.settings?.nextNumber ?? 1,
        }))}
        sessionCount={sessionCount}
        role={user.role}
      />
    </div>
  );
}
