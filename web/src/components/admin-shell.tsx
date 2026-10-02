"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Banknote, Building2, CreditCard, LayoutDashboard, LogOut, Mail, Receipt, Settings, Users, Wallet } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./wordmark";
import { AdminNotifications } from "./admin-notifications";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Transactions", href: "/admin/transactions", icon: Receipt },
  { label: "Wallets", href: "/admin/wallets", icon: Wallet },
  { label: "Payouts", href: "/admin/payouts", icon: Banknote },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Contact submissions", href: "/admin/contact-submissions", icon: Mail },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/** Redirects to /login if signed out or signed in with the wrong scope. */
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const scope = useAuthStore((state) => state.scope);
  const clear = useAuthStore((state) => state.clear);

  useEffect(() => {
    if (!accessToken || scope !== "admin") router.replace("/login");
  }, [accessToken, scope, router]);

  if (!accessToken || scope !== "admin") return null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface/60 md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Logo size="sm" />
          <span className="text-xs font-semibold text-muted-foreground">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV.map((item, i) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`flex animate-fade-in-up items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <button
            onClick={() => {
              clear();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Logo size="sm" />
          </div>
          <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
          <div className="flex items-center gap-1">
            <AdminNotifications />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-4 py-6 animate-fade-in sm:px-6 sm:py-8">{children}</main>
        <nav className="flex gap-1 overflow-x-auto border-t border-border bg-surface/60 px-2 py-2 md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${active ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
