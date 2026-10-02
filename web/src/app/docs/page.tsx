"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const BASE = "https://api.sapokpay.com/api/v1";

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-surface px-4 py-4 text-[0.78rem] leading-relaxed shadow-card">
      <code className="text-foreground">{children}</code>
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-10 first:pt-0 last:border-b-0">
      <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

const NAV = [
  { href: "#getting-started", label: "Getting started" },
  { href: "#authentication", label: "Authentication" },
  { href: "#idempotency", label: "Idempotency" },
  { href: "#wallets", label: "Wallets" },
  { href: "#bank-accounts", label: "Bank accounts" },
  { href: "#transfers", label: "Transfers" },
  { href: "#payroll-batches", label: "Payroll batches" },
  { href: "#api-keys", label: "API keys" },
  { href: "#webhooks", label: "Webhooks" },
];

export default function DocsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <SiteHeader />

      <div className="mx-auto flex max-w-6xl gap-10 px-4 py-10 sm:px-6">
        <nav className="hidden w-48 shrink-0 lg:block">
          <div className="sticky top-24 flex flex-col gap-1">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="mb-8">
            <h1 className="font-display text-4xl font-extrabold text-foreground">Documentation</h1>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              Everything you need to integrate SAPOK Pay as a merchant — wallets, bank transfers, payroll payouts, API keys and webhooks.
            </p>
          </div>

          <Section id="getting-started" title="Getting started">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Create a merchant account — you get a live wallet and an access token in the same call, no separate approval step.
            </p>
            <Code>{`curl -X POST ${BASE}/auth/merchant/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@business.com","password":"••••••••","businessName":"Acme Inc"}'

# -> { "success": true, "data": { "accessToken": "...", "expiresIn": 900 } }`}</Code>
            <p className="text-sm leading-relaxed text-muted-foreground">Sign back in any time with your email and password:</p>
            <Code>{`curl -X POST ${BASE}/auth/merchant/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@business.com","password":"••••••••"}'`}</Code>
          </Section>

          <Section id="authentication" title="Authentication">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every request after signup/login is authenticated with a Bearer access token, or with a scoped API key created from your dashboard
              (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">Authorization: Bearer sapok_live_...</code>). Access tokens expire in 15 minutes; API keys don't
              expire until you revoke them.
            </p>
            <Code>{`curl ${BASE}/wallets/me \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN"`}</Code>
          </Section>

          <Section id="idempotency" title="Idempotency">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every endpoint that moves money — deposits, withdrawals, payroll batches — requires an{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Idempotency-Key</code> header. Replay the exact same request with the same key after a
              timeout and you get the original result back, enforced by a unique database constraint, not just a best-effort cache.
            </p>
            <Code>{`-H "Idempotency-Key: $(uuidgen)"`}</Code>
          </Section>

          <Section id="wallets" title="Wallets">
            <p className="text-sm leading-relaxed text-muted-foreground">One live wallet per merchant, created automatically at signup.</p>
            <Code>{`GET ${BASE}/wallets/me
# -> { id, merchantId, currency, balanceMinor, createdAt }

GET ${BASE}/wallets/me/transactions
# -> [{ id, walletId, reference, type, status, amountMinor, currency, createdAt, ... }]`}</Code>
          </Section>

          <Section id="bank-accounts" title="Bank accounts">
            <p className="text-sm leading-relaxed text-muted-foreground">Link a bank account before you can deposit from or withdraw to it.</p>
            <Code>{`curl -X POST ${BASE}/wallets/bank-accounts \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"accountNumber":"0123456789"}'
# -> { id, merchantId, accountNumber, accountName, bankCode, createdAt }`}</Code>
          </Section>

          <Section id="transfers" title="Transfers">
            <p className="text-sm leading-relaxed text-muted-foreground">Deposits credit your wallet from a linked bank account; withdrawals debit it. Both require an Idempotency-Key.</p>
            <Code>{`curl -X POST ${BASE}/wallets/me/deposits \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"bankAccountId":"<bank-account-id>","amountMinor":500000}'

curl -X POST ${BASE}/wallets/me/withdrawals \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"bankAccountId":"<bank-account-id>","amountMinor":200000}'`}</Code>
          </Section>

          <Section id="payroll-batches" title="Payroll batches">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pay up to 500 recipients in one call. Items are processed independently — one bad account doesn't fail the whole batch.
            </p>
            <Code>{`curl -X POST ${BASE}/wallets/me/payroll-batches \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"items":[{"recipientAccountNumber":"0123456789","amountMinor":15000000,"recipientLabel":"Jane D."}]}'
# -> { id, reference, status: "COMPLETED" | "PARTIALLY_FAILED" | "FAILED", totalAmountMinor, items: [...] }`}</Code>
          </Section>

          <Section id="api-keys" title="API keys">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Scoped credentials for server-to-server integration. The raw key is returned exactly once, at creation — store it immediately.
            </p>
            <Code>{`curl -X POST ${BASE}/api-keys \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Production backend"}'
# -> { id, name, prefix, rawKey, createdAt } — rawKey only ever shown here`}</Code>
          </Section>

          <Section id="webhooks" title="Webhooks">
            <p className="text-sm leading-relaxed text-muted-foreground">Register one endpoint to receive every transaction and payroll event, signed with a secret only you and SAPOK Pay hold.</p>
            <Code>{`curl -X PUT ${BASE}/webhooks/endpoint \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://yourapp.com/webhooks/sapok-pay"}'
# -> { id, url, secret, createdAt, updatedAt }`}</Code>
            <Code>{`// Verify the signature on every incoming webhook
import crypto from "crypto";

function isValidSignature(rawBody: string, signatureHeader: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}`}</Code>
          </Section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
