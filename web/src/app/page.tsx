"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Key, ShieldCheck, Users, Wallet, Webhook, Zap } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { useAuthStore } from "@/lib/auth-store";
import { PoweredBySapok } from "@/components/powered-by-sapok";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/wordmark";
import { PaymentFlow } from "@/components/payment-flow";

const FEATURES = [
  { icon: Wallet, title: "Wallets", body: "Every merchant gets a live balance the moment they sign up — no approval queue, no waiting on manual review." },
  { icon: Building2, title: "Bank connections", body: "Link a bank account and move money between it and a wallet in both directions, backed by idempotent transfers." },
  { icon: Zap, title: "Instant transfers", body: "Deposits and withdrawals post in real time, each one guarded by an idempotency key so retries can never double-charge." },
  { icon: Users, title: "Payroll batches", body: "Pay a whole team in a single disbursement — one batch, many recipients, one audit trail." },
  { icon: Key, title: "Scoped API keys", body: "Issue keys for server-to-server integration, each one revocable the moment it's no longer needed." },
  { icon: Webhook, title: "Signed webhooks", body: "Every transfer and payroll event ships as a signed webhook, so your systems can verify it actually came from SAPOK Pay." },
];

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#developers", label: "Developers" },
];

const DEVELOPER_POINTS = [
  "Every mutating call takes an Idempotency-Key — retry a timed-out request without any risk of double-moving money.",
  "A live wallet from the first API call — no approval queue between signup and your first transfer.",
  "Signed webhooks for every transaction and payroll event, verifiable against a secret only you and SAPOK Pay hold.",
];

const QUICKSTART_SNIPPET = `# 1. Create a merchant — gets a live wallet instantly
curl -X POST https://api.sapokpay.com/api/v1/auth/merchant/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@business.com","password":"••••••••","businessName":"Acme Inc"}'

# 2. Move money — idempotent by design
curl -X POST https://api.sapokpay.com/api/v1/wallets/me/deposits \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"bankAccountId":"bank_123","amountMinor":500000}'`;

export default function RootPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const scope = useAuthStore((state) => state.scope);

  useEffect(() => {
    if (accessToken && scope === "merchant") router.replace("/wallet");
    if (accessToken && scope === "admin") router.replace("/admin");
  }, [accessToken, scope, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,hsl(var(--primary)/0.14),transparent_55%)]" />
      <div className="pointer-events-none fixed -inset-1/3 animate-float bg-[radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.1),transparent_45%)]" />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </a>
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

      <section className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-6">
        <div className="flex flex-col gap-6 animate-fade-in-up">
          <span className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Powered by SAPOK
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
            Payments infrastructure, <span className="bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">wired right.</span>
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            SAPOK Pay gives every merchant a wallet, a bank connection and a set of signed webhooks on day one —
            the payments layer other products build on, not another dashboard to babysit.
          </p>
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
              <CardContent className="flex flex-col gap-3 pt-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-display text-base font-bold text-foreground">{title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="developers" className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </span>
            <h2 className="font-display text-3xl font-bold text-foreground">Built for developers, trusted by finance teams</h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Two calls and you're moving money — a merchant account, a wallet and an API key are the same step.
            </p>
            <ul className="flex flex-col gap-3">
              {DEVELOPER_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="leading-relaxed text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-1 w-fit">
              <Button className="group">
                Get your API keys
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f5c542]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">zero to moving money</span>
            </div>
            <pre className="overflow-x-auto px-4 py-5 text-[0.78rem] leading-relaxed">
              <code className="text-foreground">{QUICKSTART_SNIPPET}</code>
            </pre>
          </div>
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 border-t border-border px-4 py-10 sm:px-6">
        <Logo />
        <div className="flex gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/login" className="transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup" className="transition-colors hover:text-foreground">
            Sign up
          </Link>
        </div>
        <PoweredBySapok />
      </footer>
    </main>
  );
}
