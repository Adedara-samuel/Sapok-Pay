"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Key, Webhook } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const API_DOCS_URL = (process.env.NEXT_PUBLIC_SAPOK_PAY_API_URL ?? "http://localhost:4100") + "/api/v1/docs";

const DEVELOPER_POINTS = [
  "Every mutating call takes an Idempotency-Key — retry a timed-out request without any risk of double-moving money.",
  "A live wallet from the first API call — no approval queue between signup and your first transfer.",
  "Signed webhooks for every transaction and payroll event, verifiable against a secret only you and SAPOK Pay hold.",
];

const SIGNUP_SNIPPET = `curl -X POST https://api.sapokpay.com/api/v1/auth/merchant/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@business.com","password":"••••••••","businessName":"Acme Inc"}'

# -> { "accessToken": "...", "expiresIn": 900 }`;

const DEPOSIT_SNIPPET = `curl -X POST https://api.sapokpay.com/api/v1/wallets/me/deposits \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"bankAccountId":"bank_123","amountMinor":500000}'`;

const WEBHOOK_SNIPPET = `// Verify the signature SAPOK Pay sends with every webhook event
import crypto from "crypto";

function isValidSignature(rawBody: string, signatureHeader: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}`;

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f5c542]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">{title}</span>
      </div>
      <pre className="overflow-x-auto px-4 py-5 text-[0.78rem] leading-relaxed">
        <code className="text-foreground">{code}</code>
      </pre>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,hsl(var(--primary)/0.14),transparent_55%)]" />

      <SiteHeader />

      <section className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl">
          Integrate payments <span className="bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">like Paystack or Flutterwave</span> — just for your own app.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Sign up as a merchant, get a wallet and an API key in the same step, and start moving money. No approval
          queue, no sales call required to start building.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/signup">
            <Button className="group">
              Create a merchant account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <a href={API_DOCS_URL} target="_blank" rel="noreferrer">
            <Button variant="outline">Full API reference</Button>
          </a>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-col gap-3 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">Why build on SAPOK Pay</h2>
        </div>
        <ul className="mx-auto flex max-w-2xl flex-col gap-3">
          {DEVELOPER_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="leading-relaxed text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Key className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">1. Sign up and get a wallet</h2>
        </div>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          One call creates your merchant account, a live wallet and returns an access token — no separate
          "activate your account" step.
        </p>
        <CodeBlock title="create a merchant account" code={SIGNUP_SNIPPET} />
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ArrowRight className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">2. Move money, idempotently</h2>
        </div>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Every deposit, withdrawal and payroll payout takes an <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Idempotency-Key</code> header —
          retry safely on a timeout or flaky connection without ever double-moving money.
        </p>
        <CodeBlock title="fund a wallet" code={DEPOSIT_SNIPPET} />
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Webhook className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">3. React to events with webhooks</h2>
        </div>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Register an endpoint and SAPOK Pay signs every event it sends you — verify the signature before trusting
          the payload, the same way you'd verify any payment provider's webhook.
        </p>
        <CodeBlock title="verify-webhook.ts" code={WEBHOOK_SNIPPET} />
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Card className="overflow-hidden">
          <div className="flex flex-col items-center gap-4 p-6 py-14 text-center sm:p-14">
            <h2 className="font-display text-3xl font-bold text-foreground">Ready to start building?</h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Create a merchant account and you'll have a live wallet and an API key before you've finished reading the reference.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button className="group">
                  Create a merchant account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <a href={API_DOCS_URL} target="_blank" rel="noreferrer">
                <Button variant="outline">Full API reference</Button>
              </a>
            </div>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
