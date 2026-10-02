"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Key, Lock, ShieldCheck, Users, Wallet, Webhook, Zap } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PaymentFlow } from "@/components/payment-flow";

const FEATURES = [
  { icon: Wallet, title: "Wallets", body: "Every merchant gets a live balance the moment they sign up — no approval queue, no waiting on manual review." },
  { icon: Building2, title: "Bank connections", body: "Link a bank account and move money between it and a wallet in both directions, backed by idempotent transfers." },
  { icon: Zap, title: "Instant transfers", body: "Deposits and withdrawals post in real time, each one guarded by an idempotency key so retries can never double-charge." },
  { icon: Users, title: "Payroll batches", body: "Pay a whole team in a single disbursement — one batch, many recipients, one audit trail." },
  { icon: Key, title: "Scoped API keys", body: "Issue keys for server-to-server integration, each one revocable the moment it's no longer needed." },
  { icon: Webhook, title: "Signed webhooks", body: "Every transfer and payroll event ships as a signed webhook, so your systems can verify it actually came from SAPOK Pay." },
];

const DEEP_DIVES = [
  {
    icon: Lock,
    title: "Idempotent by design",
    body: "Every mutating endpoint — deposits, withdrawals, payroll batches, admin adjustments — requires an Idempotency-Key header. Replay the exact same request after a timeout and you get the original result back, never a duplicate transaction. It isn't a best-effort guard; it's enforced at the database level with a unique constraint on the key.",
  },
  {
    icon: ShieldCheck,
    title: "A real double-entry ledger",
    body: "A wallet never carries a mutable balance column. Every transaction posts exactly two ledger entries — one debit, one credit — and a balance is always computed by summing them. Concurrent debits are serialized at the database isolation level, so two requests racing against the same balance can't both succeed.",
  },
];

export default function RootPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const scope = useAuthStore((state) => state.scope);

  const settingsQuery = useQuery({ queryKey: ["site-settings"], queryFn: () => apiClient.siteSettings.getPublic() });
  const settings = settingsQuery.data;

  useEffect(() => {
    if (accessToken && scope === "merchant") router.replace("/wallet");
    if (accessToken && scope === "admin") router.replace("/admin");
  }, [accessToken, scope, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,hsl(var(--primary)/0.14),transparent_55%)]" />
      <div className="pointer-events-none fixed -inset-1/3 animate-float bg-[radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.1),transparent_45%)]" />

      <SiteHeader />

      <section className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-6">
        <div className="flex flex-col gap-6 animate-fade-in-up">
          <span className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {settings?.hero_eyebrow ?? <span className="inline-block h-3 w-28 animate-pulse rounded bg-muted" />}
          </span>

          {settings ? (
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
              {settings.hero_headline.replace(/\.$/, "")}
              <span className="bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">.</span>
            </h1>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="h-11 w-full max-w-md animate-pulse rounded bg-muted sm:h-14" />
              <span className="h-11 w-3/4 max-w-sm animate-pulse rounded bg-muted sm:h-14" />
            </div>
          )}

          {settings ? (
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{settings.hero_subheadline}</p>
          ) : (
            <span className="h-16 w-full max-w-lg animate-pulse rounded bg-muted" />
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button className="group">
                Create a merchant account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Log in</Button>
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-fade-in-up [animation-delay:120ms] lg:max-w-none">
          <PaymentFlow className="h-auto w-full" />
        </div>
      </section>

      <section id="features" className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-col gap-3 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">Everything a business needs to move money</h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            One platform for wallets, bank transfers, payroll and the API surface to automate all of it.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Card key={title} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-in-up transition-colors hover:border-primary/40">
              <div className="flex flex-col gap-3 p-5 sm:p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-display text-base font-bold text-foreground">{title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-20">
        {DEEP_DIVES.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-surface">
              <Icon className="h-16 w-16 text-primary/70" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="relative mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2">
        <Card className="transition-colors hover:border-primary/40">
          <div className="flex flex-col gap-3 p-6 sm:p-8">
            <p className="font-display text-xl font-bold text-foreground">Simple, transparent pricing</p>
            <p className="text-sm leading-relaxed text-muted-foreground">Start free. See every plan and exactly how the per-transaction fee works.</p>
            <Link href="/pricing" className="mt-1 w-fit">
              <Button variant="outline" className="group">
                View pricing
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </Card>
        <Card className="transition-colors hover:border-primary/40">
          <div className="flex flex-col gap-3 p-6 sm:p-8">
            <p className="font-display text-xl font-bold text-foreground">Built for developers</p>
            <p className="text-sm leading-relaxed text-muted-foreground">A real quickstart, the full API reference, and how authentication and webhooks work.</p>
            <Link href="/developers" className="mt-1 w-fit">
              <Button variant="outline" className="group">
                Read the docs
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Card className="overflow-hidden">
          <div className="flex flex-col items-center gap-4 p-6 py-14 text-center sm:p-14">
            {settings ? (
              <>
                <h2 className="font-display text-3xl font-bold text-foreground">{settings.cta_headline}</h2>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{settings.cta_subheadline}</p>
              </>
            ) : (
              <div className="flex w-full max-w-md flex-col items-center gap-3">
                <span className="h-8 w-56 animate-pulse rounded bg-muted" />
                <span className="h-5 w-full animate-pulse rounded bg-muted" />
              </div>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button className="group">
                  Create a free account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline">Contact sales</Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
