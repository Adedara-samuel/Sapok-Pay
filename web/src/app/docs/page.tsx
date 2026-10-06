"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CurlBlock, EndpointCard } from "@/components/docs-endpoint";

const BASE = "https://api.sapokpay.com/api/v1";

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-10 first:pt-0 last:border-b-0">
      <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{intro}</p>}
      <div className="mt-5 flex flex-col gap-4">{children}</div>
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
  { href: "#errors", label: "Errors" },
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
              Everything you need to integrate SAPOK Pay as a merchant — wallets, bank transfers, payroll payouts, API keys and webhooks. Every request and
              response below is the real shape the API returns, not illustrative.
            </p>
          </div>

          <Section id="getting-started" title="Getting started" intro="Create a merchant account — you get a live wallet and an access token in the same call.">
            <EndpointCard
              method="POST"
              path="/auth/merchant/signup"
              auth="public"
              description="Creates a Merchant, a Wallet and a Free-plan Subscription in one transaction, and returns an access token immediately — no separate approval step."
              params={[
                { name: "email", type: "string", required: true, description: "A valid, unique email address." },
                { name: "password", type: "string", required: true, description: "Minimum 8 characters." },
                { name: "businessName", type: "string", required: true, description: "Shown throughout your dashboard and in admin tooling." },
              ]}
              request={{ email: "you@business.com", password: "••••••••", businessName: "Acme Inc" }}
              response={{ accessToken: "eyJhbGciOiJIUzI1NiIs...", expiresIn: 900 }}
            />
            <EndpointCard
              method="POST"
              path="/auth/merchant/login"
              auth="public"
              description="Sign back in any time with your email and password."
              params={[
                { name: "email", type: "string", required: true, description: "The email you signed up with." },
                { name: "password", type: "string", required: true, description: "Your account password." },
              ]}
              request={{ email: "you@business.com", password: "••••••••" }}
              response={{ accessToken: "eyJhbGciOiJIUzI1NiIs...", expiresIn: 900 }}
            />
          </Section>

          <Section id="authentication" title="Authentication">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every request after signup/login is authenticated with a Bearer access token (expires in 15 minutes), or a scoped API key created from your
              dashboard that doesn't expire until you revoke it.
            </p>
            <CurlBlock
              title="authenticated request"
              code={`curl ${BASE}/wallets/me \\
  -H "Authorization: Bearer $SAPOK_PAY_TOKEN"`}
            />
          </Section>

          <Section id="idempotency" title="Idempotency">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every endpoint that moves money — deposits, withdrawals, payroll batches — requires an{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Idempotency-Key</code> header. Replay the exact same request with the same key after a
              timeout and you get the original result back, enforced by a unique database constraint on the key — not a best-effort cache.
            </p>
            <CurlBlock title="idempotency header" code={`-H "Idempotency-Key: $(uuidgen)"`} />
          </Section>

          <Section id="wallets" title="Wallets" intro="One live wallet per merchant, created automatically at signup.">
            <EndpointCard
              method="GET"
              path="/wallets/me"
              auth="bearer"
              description="Your wallet and its current balance — computed from the ledger, never stored as a mutable counter."
              response={{ id: "a1b2c3d4-...", merchantId: "e5f6a7b8-...", currency: "NGN", balanceMinor: 5000000, createdAt: "2026-09-12T08:00:00.000Z" }}
            />
            <EndpointCard
              method="GET"
              path="/wallets/me/transactions"
              auth="bearer"
              description="Every transaction ever posted to your wallet, newest first."
              response={[
                {
                  id: "f1a2b3c4-...",
                  walletId: "a1b2c3d4-...",
                  reference: "TXN-...",
                  type: "FUNDING",
                  status: "SUCCESSFUL",
                  amountMinor: 500000,
                  currency: "NGN",
                  createdAt: "2026-09-12T09:00:00.000Z",
                },
              ]}
            />
          </Section>

          <Section id="bank-accounts" title="Bank accounts" intro="Link a bank account before you can deposit from or withdraw to it.">
            <EndpointCard
              method="GET"
              path="/wallets/bank-accounts"
              auth="bearer"
              description="Every bank account you've linked."
              response={[{ id: "b1c2d3e4-...", merchantId: "e5f6a7b8-...", accountNumber: "0123456789", accountName: "Acme Inc", bankCode: "MOCK001", createdAt: "2026-09-12T08:05:00.000Z" }]}
            />
            <EndpointCard
              method="POST"
              path="/wallets/bank-accounts"
              auth="bearer"
              description="Verifies and links a new bank account."
              params={[
                { name: "accountNumber", type: "string", required: true, description: "Exactly 10 digits." },
                { name: "bankCode", type: "string", required: false, description: 'Defaults to "MOCK001" in this environment.' },
              ]}
              request={{ accountNumber: "0123456789" }}
              response={{ id: "b1c2d3e4-...", merchantId: "e5f6a7b8-...", accountNumber: "0123456789", accountName: "Acme Inc", bankCode: "MOCK001", createdAt: "2026-09-12T08:05:00.000Z" }}
            />
          </Section>

          <Section id="transfers" title="Transfers" intro="Deposits credit your wallet from a linked bank account; withdrawals debit it. Both are idempotent.">
            <EndpointCard
              method="POST"
              path="/wallets/me/deposits"
              auth="bearer"
              idempotent
              description="Moves money from a linked bank account into your wallet."
              params={[
                { name: "bankAccountId", type: "uuid", required: true, description: "A bank account you've already linked." },
                { name: "amountMinor", type: "integer", required: true, description: "Amount in the smallest currency unit (kobo for NGN)." },
                { name: "simulateFailure", type: "boolean", required: false, description: "Test environment only — forces a FAILED result." },
              ]}
              request={{ bankAccountId: "b1c2d3e4-...", amountMinor: 500000 }}
              response={{
                id: "f1a2b3c4-...",
                walletId: "a1b2c3d4-...",
                reference: "TXN-...",
                type: "FUNDING",
                status: "SUCCESSFUL",
                amountMinor: 500000,
                currency: "NGN",
                idempotencyKey: "a4f0b...-...",
                createdAt: "2026-09-12T09:00:00.000Z",
              }}
            />
            <EndpointCard
              method="POST"
              path="/wallets/me/withdrawals"
              auth="bearer"
              idempotent
              description="Moves money from your wallet to a linked bank account."
              params={[
                { name: "bankAccountId", type: "uuid", required: true, description: "A bank account you've already linked." },
                { name: "amountMinor", type: "integer", required: true, description: "Amount in the smallest currency unit (kobo for NGN)." },
                { name: "simulateFailure", type: "boolean", required: false, description: "Test environment only — forces a FAILED result." },
              ]}
              request={{ bankAccountId: "b1c2d3e4-...", amountMinor: 200000 }}
              response={{
                id: "f9e8d7c6-...",
                walletId: "a1b2c3d4-...",
                reference: "TXN-...",
                type: "PAYOUT",
                status: "SUCCESSFUL",
                amountMinor: 200000,
                currency: "NGN",
                idempotencyKey: "b7e1c...-...",
                createdAt: "2026-09-12T09:05:00.000Z",
              }}
            />
          </Section>

          <Section id="payroll-batches" title="Payroll batches" intro="Pay up to 500 recipients in one call. Items are processed independently — one bad account doesn't fail the whole batch.">
            <EndpointCard
              method="POST"
              path="/wallets/me/payroll-batches"
              auth="bearer"
              idempotent
              description="Submits a batch of payouts to third-party accounts."
              params={[{ name: "items", type: "array (1–500)", required: true, description: "Each item: recipientAccountNumber, amountMinor, optional recipientLabel." }]}
              request={{ items: [{ recipientAccountNumber: "0123456789", amountMinor: 15000000, recipientLabel: "Jane D." }] }}
              response={{
                id: "c3d4e5f6-...",
                reference: "PAYROLL-...",
                status: "COMPLETED",
                totalAmountMinor: 15000000,
                currency: "NGN",
                items: [{ id: "d4e5f6a7-...", recipientAccountNumber: "0123456789", amountMinor: 15000000, status: "SUCCESSFUL", recipientLabel: "Jane D." }],
              }}
            />
            <EndpointCard
              method="GET"
              path="/wallets/me/payroll-batches"
              auth="bearer"
              description="Every payroll batch you've submitted, newest first."
              response={[{ id: "c3d4e5f6-...", reference: "PAYROLL-...", status: "COMPLETED", totalAmountMinor: 15000000, currency: "NGN", createdAt: "2026-09-12T10:00:00.000Z", completedAt: "2026-09-12T10:00:02.000Z" }]}
            />
            <EndpointCard
              method="GET"
              path="/wallets/me/payroll-batches/:id"
              auth="bearer"
              description="A single batch with its full per-recipient breakdown."
              response={{
                id: "c3d4e5f6-...",
                reference: "PAYROLL-...",
                status: "COMPLETED",
                totalAmountMinor: 15000000,
                currency: "NGN",
                items: [{ id: "d4e5f6a7-...", recipientAccountNumber: "0123456789", amountMinor: 15000000, status: "SUCCESSFUL", failureReason: null }],
              }}
            />
          </Section>

          <Section id="api-keys" title="API keys" intro="Scoped credentials for server-to-server integration. The raw key is returned exactly once, at creation.">
            <EndpointCard
              method="POST"
              path="/api-keys"
              auth="bearer"
              description="Creates a new key. Store rawKey immediately — it's never shown again."
              params={[{ name: "name", type: "string", required: true, description: "A label to identify this key later, e.g. \"Production backend\"." }]}
              request={{ name: "Production backend" }}
              response={{ id: "e1f2a3b4-...", name: "Production backend", prefix: "sapok_live_8f2a", rawKey: "sapok_live_8f2a9c...redacted...", createdAt: "2026-09-12T08:10:00.000Z" }}
            />
            <EndpointCard
              method="GET"
              path="/api-keys"
              auth="bearer"
              description="Every key you've created — never includes the raw secret, only its prefix."
              response={[{ id: "e1f2a3b4-...", name: "Production backend", prefix: "sapok_live_8f2a", status: "ACTIVE", lastUsedAt: "2026-09-20T14:00:00.000Z", createdAt: "2026-09-12T08:10:00.000Z", revokedAt: null }]}
            />
            <EndpointCard method="DELETE" path="/api-keys/:id" auth="bearer" description="Revokes a key immediately — already-issued requests using it start failing right away." response={{ revoked: true }} />
          </Section>

          <Section id="webhooks" title="Webhooks" intro="Register one endpoint to receive every transaction and payroll event, signed with a secret only you and SAPOK Pay hold.">
            <EndpointCard
              method="PUT"
              path="/webhooks/endpoint"
              auth="bearer"
              description="Sets (or creates, with a new secret) your webhook endpoint."
              params={[{ name: "url", type: "string (URL)", required: true, description: "Where SAPOK Pay sends event payloads." }]}
              request={{ url: "https://yourapp.com/webhooks/sapok-pay" }}
              response={{ id: "f1a2b3c4-...", url: "https://yourapp.com/webhooks/sapok-pay", secret: "whsec_8f2a...redacted...", createdAt: "2026-09-12T08:15:00.000Z", updatedAt: "2026-09-12T08:15:00.000Z" }}
            />
            <EndpointCard method="POST" path="/webhooks/endpoint/rotate-secret" auth="bearer" description="Issues a new signing secret for your endpoint — the old one stops verifying immediately." response={{ id: "f1a2b3c4-...", url: "https://yourapp.com/webhooks/sapok-pay", secret: "whsec_9b3c...redacted...", updatedAt: "2026-09-20T10:00:00.000Z" }} />
            <EndpointCard
              method="GET"
              path="/webhooks/events"
              auth="bearer"
              description="Every event SAPOK Pay has attempted to deliver to you."
              response={[{ id: "a9b8c7d6-...", eventType: "transaction.successful", status: "DELIVERED", responseStatus: 200, attempts: 1, createdAt: "2026-09-12T09:00:01.000Z", lastAttemptAt: "2026-09-12T09:00:01.000Z" }]}
            />
            <EndpointCard method="POST" path="/webhooks/events/:id/redeliver" auth="bearer" description="Re-sends a specific event — useful if your endpoint was briefly down." response={{ id: "a9b8c7d6-...", eventType: "transaction.successful", status: "DELIVERED", attempts: 2 }} />
            <CurlBlock
              title="verify-webhook.ts"
              code={`import crypto from "crypto";

function isValidSignature(rawBody: string, signatureHeader: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}`}
            />
          </Section>

          <Section id="errors" title="Errors" intro="Every error response shares one shape, with a stable machine-readable code you can branch on.">
            <CurlBlock
              title="error response shape"
              code={`{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "This wallet does not have enough balance for this debit",
    "details": { "availableMinor": 100000, "requestedMinor": 500000 }
  }
}`}
            />
          </Section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
