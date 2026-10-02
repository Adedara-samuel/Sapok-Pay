"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PoweredBySapok } from "@/components/powered-by-sapok";
import { Logo } from "@/components/wordmark";

/** Shared across every marketing page — the tagline is the one piece of its own copy, pulled live so it stays in sync with what an admin sets. */
export function SiteFooter() {
  const settingsQuery = useQuery({ queryKey: ["site-settings"], queryFn: () => apiClient.siteSettings.getPublic() });
  const settings = settingsQuery.data;

  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
          <Logo />
          <p className="max-w-[18rem] text-sm text-muted-foreground">{settings?.footer_tagline ?? "Modern payments infrastructure."}</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-foreground">Product</p>
          <Link href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/developers" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Developers
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-foreground">Developers</p>
          <Link href="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Documentation
          </Link>
          <Link href="/integrations" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Integrations
          </Link>
          <Link href="/status" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            System status
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-foreground">Support</p>
          <Link href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Contact us
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Sign up
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <PoweredBySapok />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SAPOK Pay. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
