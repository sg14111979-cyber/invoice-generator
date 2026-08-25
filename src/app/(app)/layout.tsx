import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getActiveBrand, listBrands } from "@/lib/brand";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [brands, activeBrand] = await Promise.all([
    listBrands(user.id),
    getActiveBrand(user.id),
  ]);

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role }}
      brands={brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        logoPath: brand.logoPath,
        currency: brand.settings?.currency ?? "INR",
      }))}
      activeBrandId={activeBrand?.id ?? null}
    >
      {children}
    </AppShell>
  );
}
