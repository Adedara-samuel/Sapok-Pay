"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;
const bpsToPercent = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;

const CHARGES_POINTS = [
  "No setup fee and no monthly minimum beyond your plan's price — Free costs ₦0.",
  "The per-transaction fee is deducted automatically from each successful transaction, never billed separately.",
  "Upgrade or downgrade at any time — the new rate applies from your very next transaction.",
  "Failed and reversed transactions are never charged a fee.",
];

const FAQS = [
  {
    q: "How is the transaction fee calculated?",
    a: "As a percentage of each successful transaction's amount — shown on every plan above. A ₦10,000 transaction on Growth (1.00%) carries a ₦100 fee.",
  },
  {
    q: "Is there a contract or lock-in period?",
    a: "No. Every plan bills monthly and you can change plans at any time from your dashboard — there's no annual commitment.",
  },
  {
    q: "What happens if a transaction fails?",
    a: "Nothing is charged. The transaction fee only applies to transactions that actually reach SUCCESSFUL status.",
  },
];

export default function PricingPage() {
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: () => apiClient.plans.listPublic() });
  const plans = plansQuery.data ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,hsl(var(--primary)/0.14),transparent_55%)]" />

      <SiteHeader />

      <section className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl">
          Simple, transparent <span className="bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">pricing.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Start free. Upgrade when your transaction volume asks for a lower per-transaction fee — no setup cost, no contract.
        </p>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {plans.length === 0 && [0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-lg border border-border bg-surface" />)}
          {plans.map((plan) => (
            <Card key={plan.key} className={plan.key === "growth" ? "border-primary/50 shadow-glow" : ""}>
              <div className="flex flex-col gap-4 p-6 sm:p-7">
                {plan.key === "growth" && (
                  <span className="w-fit rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">Most popular</span>
                )}
                <p className="font-display text-lg font-bold text-foreground">{plan.name}</p>
                <p className="font-display text-3xl font-extrabold text-foreground">
                  {naira(plan.priceMinor)}
                  <span className="text-sm font-medium text-muted-foreground">/{plan.billingInterval === "MONTHLY" ? "mo" : "yr"}</span>
                </p>
                <p className="text-sm text-muted-foreground">{bpsToPercent(plan.transactionFeeBps)} per successful transaction</p>
                <Link href="/signup">
                  <Button variant={plan.key === "growth" ? "default" : "outline"} className="w-full">
                    Get started
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">How charges actually work</h2>
            <ul className="flex flex-col gap-3">
              {CHARGES_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="leading-relaxed text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Billing questions</h2>
            <div className="flex flex-col gap-4">
              {FAQS.map((faq) => (
                <div key={faq.q}>
                  <p className="font-display text-sm font-bold text-foreground">{faq.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Card className="overflow-hidden">
          <div className="flex flex-col items-center gap-4 p-6 py-14 text-center sm:p-14">
            <h2 className="font-display text-3xl font-bold text-foreground">Still have questions about pricing?</h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Talk to sales about your expected volume and we'll help you pick the right plan.</p>
            <Link href="/contact" className="mt-2">
              <Button className="group">
                Contact sales
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
