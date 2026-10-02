"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/wordmark";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/developers", label: "Developers" },
  { href: "/contact", label: "Contact" },
];

/** Shared across every marketing page (home, pricing, developers, contact) so the nav is identical everywhere. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button>Sign up</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
