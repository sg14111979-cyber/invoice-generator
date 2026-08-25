"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import {
  BrandIcon,
  CloseIcon,
  DashboardIcon,
  HelpIcon,
  InvoiceIcon,
  ItemsIcon,
  MenuIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/icons";

export interface BrandOption {
  id: string;
  name: string;
  logoPath: string | null;
  currency: string;
}

interface AppShellProps {
  user: { name: string; email: string; role: string };
  brands: BrandOption[];
  activeBrandId: string | null;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/invoices", label: "Invoices", Icon: InvoiceIcon },
  { href: "/customers", label: "Customers", Icon: UsersIcon },
  { href: "/items", label: "Items", Icon: ItemsIcon },
  { href: "/brands", label: "Brands", Icon: BrandIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
  { href: "/help", label: "How to use", Icon: HelpIcon },
];

export function AppShell({ user, brands, activeBrandId, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const navItems = [...NAV_ITEMS];
  if (user.role === "ADMIN") {
    navItems.push({ href: "/admin/users", label: "Users", Icon: ShieldIcon });
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function switchBrand(brandId: string) {
    setSwitching(true);
    try {
      await api("/api/active-brand", { method: "POST", body: { brandId } });
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-sm font-bold text-white">
          IS
        </span>
        <span className="text-base font-semibold text-white">Invoice Studio</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
              isActive(href)
                ? "bg-white/15 text-white"
                : "text-navy-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-navy-200">{user.email}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-navy-300">
          {user.role === "ADMIN" ? "Administrator" : "User"}
        </p>
        <button className="mt-3 text-sm font-semibold text-navy-100 hover:text-white" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print hidden w-64 shrink-0 bg-navy-800 lg:block">{sidebar}</aside>

      {menuOpen ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-navy-800">
            <button
              aria-label="Close menu"
              className="absolute right-3 top-4 text-white"
              onClick={() => setMenuOpen(false)}
            >
              <CloseIcon />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <button
            aria-label="Open menu"
            className="btn-secondary px-2 py-2 lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Active brand
              </p>
              <select
                aria-label="Active brand"
                className="mt-0.5 max-w-[220px] rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200"
                value={activeBrandId ?? ""}
                disabled={switching || brands.length === 0}
                onChange={(event) => switchBrand(event.target.value)}
              >
                {brands.length === 0 ? <option value="">No brands yet</option> : null}
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <Link className="btn-primary hidden sm:inline-flex" href="/invoices/new">
              New invoice
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>

        <nav className="no-print sticky bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white sm:hidden">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                isActive(href) ? "text-navy-700" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
