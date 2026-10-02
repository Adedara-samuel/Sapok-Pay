"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { PoweredBySapok } from "./powered-by-sapok";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./wordmark";

const MERCHANT_NAV = [
  { label: "Wallet", href: "/wallet" },
  { label: "Payroll batches", href: "/payroll-batches" },
  { label: "API keys", href: "/api-keys" },
  { label: "Webhooks", href: "/webhooks" },
];

const ADMIN_NAV = [
  { label: "Merchants", href: "/admin" },
  { label: "Usage", href: "/admin/usage" },
];

/** Redirects to the right login page if signed out, or if signed in with the wrong scope for this shell. */
export function Shell({ scope, children }: { scope: "merchant" | "admin"; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentScope = useAuthStore((state) => state.scope);
  const clear = useAuthStore((state) => state.clear);

  useEffect(() => {
    if (!accessToken || currentScope !== scope) {
      router.replace("/login");
    }
  }, [accessToken, currentScope, scope, router]);

  if (!accessToken || currentScope !== scope) return null;

  const navItems = scope === "admin" ? ADMIN_NAV : MERCHANT_NAV;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-7">
          <span className="flex items-center gap-2">
            <Logo size="sm" />
            {scope === "admin" && <span className="text-sm font-medium text-muted-foreground">· Admin</span>}
          </span>
          <nav className="hidden gap-5 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${pathname === item.href ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => {
              clear();
              router.replace("/login");
            }}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </header>
      <nav className="flex gap-4 overflow-x-auto border-b border-border px-4 py-2 sm:hidden">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`shrink-0 text-sm font-medium ${pathname === item.href ? "text-foreground" : "text-muted-foreground"}`}>
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 animate-fade-in sm:px-6 sm:py-8">{children}</main>
      <footer className="flex justify-center border-t border-border py-4">
        <PoweredBySapok />
      </footer>
    </div>
  );
}
