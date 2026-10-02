"use client";

import Link from "next/link";
import { ArrowRight, Banknote, Building2, Code2, ShoppingCart, Users, Webhook } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const STEPS = [
  { title: "Create a merchant account", body: "One API call — you get a live wallet and an access token immediately, no approval queue." },
  { title: "Link a bank account", body: "Verify a bank account so you have somewhere real to fund from and withdraw to." },
  { title: "Register a webhook endpoint", body: "Give SAPOK Pay a URL to notify the moment a transaction or payroll batch settles." },
  { title: "Move money", body: "Deposits, withdrawals and payroll batches — every one idempotent, every one covered by a signed webhook." },
];

const USE_CASES = [
  {
    icon: ShoppingCart,
    title: "E-commerce checkout",
    body: "Fund a customer's wallet from their bank account at checkout, then debit it for the order — both legs are ordinary deposit/withdrawal transfers.",
  },
  {
    icon: Users,
    title: "Marketplace payouts",
    body: "Pay many sellers or contractors in one call with a payroll batch — each recipient is processed independently, so one bad account never blocks the rest.",
  },
  {
    icon: Building2,
    title: "Platform & SaaS billing",
    body: "Give each of your own customers a wallet under your merchant account, and move money between them and your platform with the same transfer primitives.",
  },
];

const INTEGRATION_PATH = {
  icon: Code2,
  title: "Direct API integration",
  body: "The only integration path today — a documented REST API over HTTPS, usable from any language with an HTTP client. No proprietary SDK required, no vendor lock-in beyond a REST client.",
};

export default function IntegrationsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,hsl(var(--primary)/0.14),transparent_55%)]" />

      <SiteHeader />

      <section className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl">
          How to <span className="bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">integrate.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          There's one integration path — a direct, documented REST API — and it's built to get you from signup to a
          moved transaction in minutes, not a sales cycle.
        </p>
      </section>

      <section className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-6">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">{i + 1}</span>
                {i < STEPS.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pb-6">
                <p className="font-display text-base font-bold text-foreground">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-col gap-3 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">Integration path</h2>
        </div>
        <Card className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-3 p-6 sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <INTEGRATION_PATH.icon className="h-5 w-5" />
            </span>
            <p className="font-display text-lg font-bold text-foreground">{INTEGRATION_PATH.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{INTEGRATION_PATH.body}</p>
            <Link href="/docs" className="mt-1 w-fit">
              <Button variant="outline" className="group">
                Read the integration docs
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-col gap-3 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">What you can build</h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            The same wallet, transfer and payroll primitives support a few common patterns out of the box.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {USE_CASES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="transition-colors hover:border-primary/40">
              <div className="flex flex-col gap-3 p-6">
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

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Card className="overflow-hidden">
          <div className="flex flex-col items-center gap-4 p-6 py-14 text-center sm:p-14">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Webhook className="h-6 w-6" />
            </span>
            <h2 className="font-display text-3xl font-bold text-foreground">Not sure which pattern fits?</h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Tell us what you're building and we'll point you at the right endpoints.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button className="group">
                  Create a merchant account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline">
                  <Banknote className="h-4 w-4" />
                  Talk to us
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
