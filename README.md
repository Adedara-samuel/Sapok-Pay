# SAPOK Pay

Organisational wallet, ledger, bank-connection and payroll-payment
infrastructure for the SAPOK ecosystem. A standalone, independently
deployable service — **not** part of the SAPOK Core API (NEXORA) monorepo,
though it's built to integrate cleanly with it.

## SAPOK ecosystem context

SAPOK is the master platform. It consists of:

- **SAPOK Control Center** — platform-level administration web app.
- **SAPOK Organisation** — the organisation-facing desktop application.
- **SAPOK Core API** — the primary organisational/business platform (lives in
  the separate `NEXORA` project/repo — that's the current working name;
  it may be renamed "SAPOK OneGrid" later).
- **SAPOK Pay** (this project) — payment, wallet, banking and payout
  infrastructure.
- **SAPOK AI** (sibling project, `../sapok-ai`) — organisational
  intelligence, AI assistance, knowledge retrieval, AI tools.

## ⚠️ Architecture pivot: public self-service platform, not internal-only

The original spec had SAPOK Pay as an internal service only NEXORA Core API
would call. **That changed.** SAPOK Pay is now a public, self-service,
multi-tenant platform in its own right — closer to "SAPOK Pay as its own
Paystack-like product":

- Any external developer/business can sign up (`POST /auth/merchant/signup`)
  and gets their own **Merchant** account + **Wallet**, immediately.
- Merchants issue their own **API keys** (`POST /api-keys`) to call the API
  from their own applications — separate from the JWT used for their
  dashboard login.
- A separate **AdminUser** role (you, the platform operator) has full
  visibility across every merchant: `GET /admin/merchants`,
  `GET /admin/merchants/:id`, `GET /admin/usage`. AdminUser is a completely
  separate login/model from Merchant, not a role flag on it — a compromised
  merchant session can never escalate to admin.
- A NEXORA Organisation being integrated via Core API is **also** just a
  Merchant row under the hood (created through a privileged endpoint instead
  of public signup) — one tenant model serves both the public product and
  the NEXORA integration, not two parallel systems.

Updated call graph — Core API is now one Merchant among many, not the only caller:

```
                          Public developers/businesses
                                      |
                                      v
SAPOK Organisation Desktop / Control Center      Merchant signup + API keys
              |                                              |
              v                                              v
        SAPOK Core API  ─────(as a Merchant)────────>  SAPOK Pay
                                                              |
                                                              v
                                                       Bank Providers
```

SAPOK Pay never depends directly on a bank/payment provider — see
[Payment provider abstraction](#payment-provider-abstraction) below.

## Project layout

```
sapok-pay/
  api/   NestJS backend — deploy to Render (persistent process, needs
         background workers eventually; Vercel's serverless model doesn't fit).
  web/   Next.js dashboard — deploy to Vercel (Root Directory: web/). Currently
         just a service-status page; the merchant/admin dashboard UI itself
         (login, wallet view, API key management, admin views) isn't built yet.
```

`api/` and `web/` are two fully independent Node projects — separate
`package.json`, separate lockfile, separate deploy target.

## Current status: Phases 1–9 done and verified end-to-end; Phase 12 (automated testing) started, core financial paths covered

**Data model** (`api/prisma/schema.prisma`):
- `Merchant`, `AdminUser`, `ApiKey`, `ApiUsageEvent` — the public-platform layer.
- `Wallet`, `LedgerAccount`, `LedgerEntry`, `Transaction` — double-entry-ready
  ledger, now with real posting logic behind it (Phase 4).
- `AuditLog` — append-only, one row per sensitive financial event (wallet
  adjustments so far).

**Wallet crediting/debiting** (`api/src/wallets/wallets.service.ts`,
`postAdjustment`) — **admin-only for now**, deliberately: there's no
bank/provider until Phase 5/6 to verify a merchant's own funding claim, so
letting a merchant credit their own wallet by calling an API would just be
minting money. An authorized admin posts adjustments instead
(`POST /admin/merchants/:id/wallet/adjustments`), and this exact posting
logic is what Phase 5+ will call once a real bank transfer confirms.
Verified end-to-end: credited a wallet from ₦0 to ₦5,000, replayed the same
`Idempotency-Key` with a different amount (correctly returned the original
transaction, did not double-credit), attempted a debit larger than the
balance (correctly rejected with `422 INSUFFICIENT_FUNDS`), debited within
balance (succeeded, balance updated correctly), and confirmed a missing
`Idempotency-Key` header is rejected outright — it's required on this
endpoint, not optional. Debits run inside a `SERIALIZABLE` Postgres
transaction specifically to prevent a double-spend race between two
concurrent debits both reading a stale balance before either commits.
`GET /wallets/me/transactions` and `GET /admin/merchants/:id/transactions`
expose the real transaction history either side can see.

**CORS**: enabled (`CORS_ORIGINS` env var, comma-separated) — corrected after
initially copying the "no CORS, service-to-service only" note from before
the self-service pivot. The web/ dashboard calls this API directly from the
browser, so CORS is genuinely needed now, unlike a pure internal service.

**Auth** (`api/src/auth/`):
- `POST /auth/merchant/signup` — creates a `Merchant` + `Wallet` +
  `LedgerAccount` in one transaction, returns a JWT.
- `POST /auth/merchant/login`, `POST /auth/admin/login`.
- Global `JwtAuthGuard` (every route needs a valid token unless `@Public()`)
  + `AdminOnlyGuard` / `MerchantOnlyGuard` for scope-restricted routes.
  Verified both directions: a merchant token gets `403 ADMIN_ONLY` on admin
  routes, an admin token gets `403 MERCHANT_ONLY` on merchant routes.
- Access-token-only for now (no refresh token rotation yet, unlike NEXORA's
  auth) — 15 minute expiry, re-login after. A deliberate scope cut, not an
  oversight; revisit if session length becomes a real complaint.

**API keys** (`api/src/api-keys/`):
- `POST /api-keys`, `GET /api-keys`, `DELETE /api-keys/:id` (revoke) —
  JWT-authenticated (dashboard session) only, not via another API key.
  Raw key (`sapok_live_<random>`) is shown exactly once, at creation; only a
  SHA-256 hash is stored (SHA-256, not bcrypt — API keys are already
  high-entropy, so a fast indexable hash is correct here, unlike passwords).

**Wallets** (`api/src/wallets/`):
- `GET /wallets/me` — the one dual-auth endpoint: accepts either a merchant
  JWT or an API key (`WalletAccessGuard`), so both the dashboard and a
  merchant's own application can check their balance.

**Admin** (`api/src/admin/`):
- `GET /admin/merchants`, `GET /admin/merchants/:id`, `GET /admin/usage` —
  real aggregate data, not placeholders: usage counts come from
  `ApiUsageEvent` rows written by `ApiUsageInterceptor` on every
  API-key-authenticated request, with the actual response status code (not
  logged in the guard, which runs before the handler and can't know the
  real outcome yet).

**web/** — now a working dashboard covering every API surface built so far
(merchant signup/login, wallet, bank accounts, deposits/withdrawals,
payroll batches, API keys, webhooks, and a separate admin app). See
"Dashboard frontend" below.

## Phases 5–7 (this change): Mock Bank, PaymentProvider abstraction, Transfers

**Why Mock Bank and PaymentProvider landed together**: the interface alone
is unusable without an implementation, and `MockBankProviderService` IS the
Phase 6 deliverable that implements the interface by calling into Phase 5's
simulated bank state — building them as two separate, sequential slices
would have meant merging half-finished plumbing.

**`PaymentProvider`** (`api/src/payments/payment-provider.interface.ts`):
`verifyAccount`, `getBalance`, `initiateTransfer`, `getTransferStatus`,
`reverseTransfer`. Bound behind a `PAYMENT_PROVIDER` DI token
(`payments.module.ts`) — every consumer injects the token, never
`MockBankProviderService` directly, so a real bank integration later is a
one-line change in that module, not a rewrite of every call site.
`reconcile()` from the original design sketch is deliberately **not** part
of the interface yet — Phase 10 needs a "list provider transactions since
X" shape that can't be honestly designed before reconciliation is actually
built.

**`MockBankProviderService`** (`api/src/payments/mock-bank-provider.service.ts`):
simulates a real bank's own account/balance state — deliberately a
separate `MockBankAccount`/`MockBankTransfer` table, not sharing
`Wallet`/`LedgerEntry`, so this behaves like an opaque third-party system
reached only through the interface, exactly like a real integration would.
One `MockBankAccount` per merchant, lazily provisioned with a ₦100,000
starting balance. Realistic behaviour: an artificial 150-400ms delay on
every call, deterministic account-name resolution (same account number
always verifies to the same name), a real insufficient-funds failure mode
when the bank side can't cover a debit, and a `simulateFailure` flag for
deterministic test injection. Resolves **synchronously** (`SUCCESSFUL`/
`FAILED`, no `PENDING`) — real async settlement latency is Phase 9
(webhooks)'s job; building fake async infrastructure now would be
premature.

**Bank accounts** (`api/src/bank-accounts/`): `POST /wallets/bank-accounts`
verifies via the provider *before* persisting (an unverifiable account
number never gets saved), `GET /wallets/bank-accounts` lists a merchant's
own linked accounts. `accountNumber` is unique per-merchant, not globally —
two different merchants can each link account number `1234567890`
independently.

**Transfers** (`api/src/transfers/`) — the actual Phase 7 unlock: merchants
can now fund and withdraw their own wallet without an admin's manual
`postAdjustment` (Phase 4's deliberate stopgap "until Phase 5/6 exist"):

- `POST /wallets/me/deposits` — bank → wallet. Debits the mock bank first
  (where insufficient-funds-at-the-bank naturally surfaces), then credits
  the wallet — crediting can't itself fail on balance grounds, so no
  compensating action is needed on that side.
- `POST /wallets/me/withdrawals` — wallet → bank. Checks the wallet balance
  optimistically before calling the provider (avoids paying the bank when
  the wallet obviously can't cover it), then re-checks authoritatively
  inside the same `Serializable`-isolation transaction `postAdjustment`
  uses. If that authoritative check loses a race, the bank has already been
  credited — so `TransfersService.withdraw` calls `provider.reverseTransfer`
  as a compensating action rather than leaving the two systems silently
  inconsistent.
- Both require the `Idempotency-Key` header, same rule as every financial
  mutation in this codebase. `WalletsService.postProviderTransfer` is the
  shared posting logic both call through — the Phase 5+ analogue of
  `postAdjustment`, parameterized by `FUNDING`/`PAYOUT` instead of a manual
  admin direction.

## Phase 8 (this change): payroll payment batches

This is the piece NEXORA's payroll will eventually plug into — the
difference between *computing* net salaries (NEXORA Phase 5, already done)
and actually *paying* them out.

**Why recipients aren't `MerchantBankAccount` rows**: withdrawing is the
merchant cashing out to their OWN verified account; a payroll batch pays
many one-off THIRD-PARTY accounts every cycle (employees), exactly like a
real payroll system — there's no "link this employee's account first"
step. Each recipient is still verified via `PaymentProvider.verifyAccount`
inline, per item, before any money moves for that item.

**`POST /wallets/me/payroll-batches`** (`api/src/payroll-batches/`) — body
is `{ items: [{ recipientAccountNumber, amountMinor, recipientLabel? }] }`,
up to 500 items, `Idempotency-Key` header required. Processes every item
**independently**:

1. Verify the recipient account. A malformed/unverifiable number fails
   only that item (`FAILED`, no money moved) — it does NOT reject the
   whole batch. This was a real bug caught during verification: the
   validation schema originally required a strict 10-digit format on
   `recipientAccountNumber`, which rejected the entire request at the HTTP
   boundary the moment any one item had a bad number, defeating the whole
   point of "partial-failure aware." Fixed by loosening that field to a
   plain non-empty string — `PaymentProvider.verifyAccount` is now the only
   place format is actually checked, per item, the way it should be.
2. `provider.initiateTransfer(..., direction: "CREDIT")` — same direction
   as a withdrawal, since money is leaving SAPOK Pay for a bank account.
3. On success, post the wallet debit via `WalletsService.postProviderTransfer`
   (type `PAYOUT`), keyed by a per-item idempotency key derived from the
   batch's key (`${idempotencyKey}:item:${index}`) so each item's ledger
   entry is independently replay-safe.
4. If that debit fails on insufficient balance (a **real** scenario: an
   earlier item in the same batch may have already spent the remaining
   balance) — the bank side already succeeded, so `reverseTransfer` is
   called as a compensating action, same pattern as `TransfersService.withdraw`.

The batch's final `status` reflects the mix: `COMPLETED` (all items
succeeded), `FAILED` (none did), `PARTIALLY_FAILED` (some did) — the
`GET /wallets/me/payroll-batches/:id` response includes every item with its
own status and `failureReason`, so a caller can see exactly who got paid
and who didn't without re-deriving it from the transaction log.

**Verified**: a 4-item batch with one success, one malformed account, one
`simulateFailure`-injected bank rejection, and one item sized to exceed the
wallet's remaining balance after the first item posted — resulted in
`PARTIALLY_FAILED`, exactly one wallet debit (the successful item), the
insufficient-balance item's bank-side credit correctly reversed, and the
wallet's final balance matching hand-calculation exactly. Replaying the
same batch idempotency key with entirely different items returned the
original cached batch unchanged (no reprocessing, no double-payment).
Cross-merchant isolation confirmed (a second merchant's batch list is
empty, fetching the first merchant's batch by ID returns `404`).

## Phase 9 (this change): outbound webhooks

This is **outbound** webhooks — SAPOK Pay notifying a merchant's own
application of events — not inbound webhooks from a bank provider. That
distinction matters: inbound bank webhooks only become meaningful once a
provider has real async settlement, and Mock Bank still resolves
synchronously (see Phase 5/6). Building fake inbound infrastructure now
would have been premature; outbound notification is useful today regardless.

**`api/src/webhooks/`**:

- `PUT /webhooks/endpoint` — register/update a merchant's webhook URL.
  Creating it generates a signing secret (`whsec_...`); updating the URL
  leaves the existing secret untouched.
- `GET /webhooks/endpoint` — view the current registration, secret
  included. Unlike an `ApiKey` (a credential the merchant presents *to* us,
  so only its hash is ever stored), a webhook secret is used by the
  *merchant* to verify signatures *from* us — they need to read it back
  whenever they want, so it's stored reversibly. **Known gap**: plain text,
  no encryption-at-rest layer exists anywhere in this project yet.
- `POST /webhooks/endpoint/rotate-secret` — issues a new secret.
- `GET /webhooks/events` — delivery log (event type, status, attempts,
  response status).
- `POST /webhooks/events/:id/redeliver` — retries a failed delivery,
  resending the **exact same** `id`/`createdAt` as the original attempt
  (not a new event) — that's what makes a merchant's own idempotent
  processing by event ID actually work across retries.

**Delivery**: `WebhooksService.fireEvent` is called from
`WalletsService.postProviderTransfer` (`transaction.successful` /
`transaction.failed`) and `PayrollBatchesService.create`
(`payroll_batch.completed`). It's a no-op if the merchant hasn't
registered an endpoint — not an error — and it **never throws**: a webhook
delivery failure must never fail the financial operation that triggered
it, so failures are only ever logged as a `WebhookEvent` row for the
merchant to see and redeliver. The signature is
`HMAC-SHA256(secret, rawJsonBody)`, sent as `X-Sapok-Signature`, alongside
`X-Sapok-Event-Id` for merchant-side dedup.

**Verified**: registered a real local HTTP listener as the webhook URL,
triggered a deposit, and confirmed actual delivery — then independently
recomputed the HMAC signature by hand and matched it byte-for-byte against
`X-Sapok-Signature`, not just checked that *a* signature header was
present. Pointed the endpoint at an unreachable port, triggered another
transaction, confirmed the event was logged `FAILED` (and the transaction
itself still succeeded normally), pointed the endpoint back at the working
receiver, redelivered, and confirmed it flipped to `DELIVERED` with
`attempts: 2`. Also confirmed a merchant with no webhook endpoint
registered at all can still transact completely normally (`fireEvent`
silently no-ops), and full cross-merchant isolation on the endpoint and
event log.

## NEXORA integration: service-to-service merchant provisioning

Not one of the numbered phases above — this is the piece the architecture
pivot note always intended ("A NEXORA Organisation being provisioned by
Core API is ALSO just a Merchant row under the hood, created via a
privileged service-auth endpoint instead of public signup") but had never
actually been built until NEXORA's own Phase 6 needed it for real.

**`POST /service/merchants`** (`api/src/service-accounts/`) — gated by
`ServiceAuthGuard`, a shared-secret header (`X-Service-Secret`) checked
with a timing-safe comparison, never a JWT scope: no human ever calls
this, so a merchant/admin token type doesn't apply here — it's a third,
separate trust boundary. Body: `{ email, businessName, externalReference }`,
where `externalReference` is the caller's own tenant ID (a NEXORA
`Organisation.id`). Creates a `Merchant` + `Wallet` + `LedgerAccount` +
one `ApiKey`, exactly like self-service signup, except:

- No password a human will ever use — one is generated, hashed, and the
  plaintext discarded immediately. Only API-key auth is expected against
  a service-provisioned merchant from then on.
- **Idempotent by `externalReference`**: calling it twice for the same
  `Organisation.id` returns the same `merchantId` rather than creating a
  duplicate merchant. Since the raw API key can only ever be shown once
  (same rule as every other API key in this system), a repeat call
  returns `apiKey: null, alreadyProvisioned: true` — the caller must
  already be holding the key from the first call.

**Verified**: wrong/missing `X-Service-Secret` both rejected (`401`); a
correct call created a real merchant and returned a working API key
(confirmed by calling `GET /wallets/me` with it); calling again with the
same `externalReference` returned the same `merchantId` with `apiKey: null`
instead of creating a second merchant.

## Dashboard frontend (`web/`)

Built from scratch in this pass — `web/` had nothing beyond a service-status
page (Next.js App Router, React Query only; no auth, no forms library, no
component kit). Added `zustand` (auth state), `react-hook-form` + `zod` +
`@hookform/resolvers` (installed for future use; the forms actually shipped
use plain `useState`, matching the pattern used throughout this project's
other frontends), and `lucide-react` for icons — all local to this
standalone repo, since it can't reach into NEXORA's shared `@nexora/ui`
package across a repo boundary. `src/components/ui.tsx` holds small
Tailwind-only primitives (Button, Card, Input, Badge) built for this app
specifically, not a full design system.

**Merchant pages** (`src/app/`): `/signup`, `/login`, `/wallet` (balance,
bank-account linking + deposit/withdraw forms, transaction history),
`/payroll-batches` (dynamic multi-row batch submission form + list with
expandable per-item results), `/api-keys` (create — raw key shown once,
matching the API's own one-time-reveal rule — list, revoke), `/webhooks`
(endpoint URL + secret display/rotation, delivery log with a Redeliver
action on failed events).

**Admin pages**: `/admin/login` (a separate login, separate token scope —
never reachable with a merchant session), `/admin` (merchant list with
balance and key-count at a glance), `/admin/usage` (API request counts by
merchant), `/admin/merchants/[id]` (detail, manual wallet adjustment form,
transaction history).

**Auth**: `src/lib/auth-store.ts` (zustand + persisted JWT, decodes
`scope` client-side for UI routing only — same "never a security boundary"
caveat as every other frontend in this ecosystem). `src/components/shell.tsx`
redirects to the right login page if signed out *or* if the stored token's
scope doesn't match the shell (`scope="merchant"` vs `scope="admin"`) — a
merchant token can never render an admin page and vice versa, enforced
client-side for UX; the API enforces it for real via `MerchantOnlyGuard`/
`AdminOnlyGuard` regardless.

**Verified**: full `tsc --noEmit` and `next build` both clean (all 12
routes compile, typecheck, and prerender); every route confirmed to serve
`200` from the dev server with no runtime module-resolution errors. **Not
verified**: actual browser interaction — this environment has no
browser/screenshot tool, so clicking through the forms, confirming the
auth-guard redirects fire correctly, and checking responsive layout at
narrow widths have not been observed. Treat this the same way as
Organisation Desktop's frontend in the NEXORA repo: "should work, compiles
cleanly" rather than "confirmed working" until someone opens it.

## Phase 12 (this change): automated tests

Every one of the previous 11 phases was verified by hand, via curl, and
never re-checked afterwards — the two real bugs found earlier this project
(the payroll-batch validation bug that blocked partial-failure handling,
and NEXORA's disbursement-retry idempotency-key bug) were both things a
regression suite would have caught automatically on the next change. This
phase turns that manual verification into permanent tests instead of
starting a new feature with no safety net under the existing ones.

**Why integration tests, not mocked unit tests**: this codebase's riskiest
logic — `Serializable`-isolation double-spend protection, idempotency
replay, the compensating `reverseTransfer` path — only means anything
against a **real** Postgres transaction. Mocking Prisma would test that the
code calls the right methods, not that the financial guarantees actually
hold. So `test/*.e2e-spec.ts` boots the real Nest app
(`test/utils/test-app.ts`, every module and guard, same global prefix as
production) against a dedicated database and drives it exactly like the
manual curl verification did — real HTTP requests via `supertest`, real
Postgres, real bcrypt (at 4 rounds in tests, not production's 12, purely
for speed).

**Setup** (`.env.test`, `test/env.setup.ts`, `test/global-setup.ts`): a
separate `sapok_pay_test` database on the same local Postgres container —
never the dev database. `global-setup.ts` runs `prisma migrate deploy` and
the seed script once before the whole run (both idempotent, safe to run
against an already-up-to-date database). Tests don't share a
truncate-between-tests reset; instead every test creates its own
merchant(s) with a random email (`test/utils/fixtures.ts`), so tests stay
independent without needing database-reset machinery yet.

**Coverage** — 22 tests across 4 suites, `pnpm test:e2e`:
- `auth.e2e-spec.ts`: signup creates a usable wallet in the same
  transaction, duplicate-email rejection, wrong-password and
  unknown-email both return the identical `INVALID_CREDENTIALS` (the
  timing-safe-login property, structurally — not a timing measurement),
  merchant/admin scope tokens rejected on each other's routes.
- `wallet-adjustments.e2e-spec.ts`: credit, idempotent replay (different
  amount/description on the replay — proves the ORIGINAL sticks, not just
  that a 200 comes back), insufficient-funds `422`, missing
  `Idempotency-Key` header `400`.
- `transfers.e2e-spec.ts`: account-number format validation, deterministic
  verify-account naming, duplicate-link rejection, deposit success,
  `simulateFailure` moves no money, withdrawal insufficient-funds `422`
  before any bank call, successful withdrawal debits correctly, and
  cross-merchant `bankAccountId` isolation (`404`, not `403` — never
  confirms the record exists to someone who doesn't own it).
- `payroll-batches.e2e-spec.ts`: the exact 4-item mixed-outcome scenario
  from Phase 8's manual verification (one success, one malformed account,
  one simulated bank rejection, one sized to force the compensating
  `reverseTransfer` path) — now asserted automatically, plus batch-level
  idempotency replay, `COMPLETED` vs `FAILED` batch status, and
  cross-merchant batch isolation.

**A real bug this pass caught, not a hypothetical**: the first full run
passed all 22 tests but Jest reported the process wouldn't exit —
`--detectOpenHandles`-style investigation traced it to `RedisModule`: the
factory-provided `ioredis` client had no lifecycle hook at all, so
`app.close()` (and a real `SIGTERM` graceful shutdown in production) never
called `.quit()` on it. Fixed by adding a small `RedisLifecycle` provider
implementing `OnModuleDestroy` alongside the existing factory — this was a
genuine production shutdown-hygiene gap the test suite surfaced as a side
effect, not something the tests were written to check for.

**What's not covered yet**: webhooks delivery, API keys, service-account
provisioning, admin endpoints, and unit-level tests for pure logic
(`payment-provider.interface.ts` helpers, `api-key.ts` utilities) — `pnpm
test` (plain Jest, no e2e config) is wired up and ready for those but has
none yet. No concurrent-request load test for the `Serializable`-isolation
double-spend protection — still reasoned through, not exercised by an
actual forced race, same gap noted since Phase 4.

## Running it locally

Backend:

```bash
cd api
cp .env.example .env          # fill in real secrets
pnpm install
docker compose up -d postgres redis
pnpm prisma:generate
pnpm prisma:migrate -- --name init
pnpm prisma:seed               # seeds the one AdminUser account
pnpm dev                       # http://localhost:4100/api/v1 (Swagger at /api/v1/docs)
```

`docker compose --profile full up -d` (from `api/`) runs everything
containerized, including the API itself (uses `api/Dockerfile`).

Frontend:

```bash
cd web
cp .env.example .env.local
pnpm install
pnpm dev                       # http://localhost:4110
```

## Deploying

- **api/** → Render, same setup as NEXORA Core API: connect the repo,
  Dockerfile build, root directory `api/`. Needs its own Postgres + Redis.
  Note: `api/pnpm-workspace.yaml` holds the `allowBuilds` approval pnpm needs
  for `@nestjs/core`/`@prisma/client`/`@prisma/engines`/`prisma`/`bcrypt`'s
  postinstall scripts — the Dockerfile's `deps` stage must copy this file
  alongside `package.json`/`pnpm-lock.yaml`, or the Render build hits the
  exact same blocked-builds error this did locally at first.
- **web/** → Vercel, root directory `web/`. Set `NEXT_PUBLIC_SAPOK_PAY_API_URL`
  to the deployed Render URL, then redeploy (env var changes need a fresh
  build to take effect for `NEXT_PUBLIC_*` values).

## Payment provider abstraction

Core rule: **SAPOK Pay's business logic must never depend directly on a
specific bank/payment provider.** Everything goes through a
`PaymentProvider` interface (introduced in Phase 6):

```ts
interface PaymentProvider {
  verifyAccount(): Promise<...>;
  getBalance(): Promise<...>;
  initiateTransfer(): Promise<...>;
  getTransferStatus(): Promise<...>;
  reverseTransfer(): Promise<...>;
  reconcile(): Promise<...>;
}
```

`MockBankProvider` (Phase 5) is the only implementation during development —
and it must behave like a real provider (realistic delays, realistic
failure modes: insufficient funds, invalid account, timeouts, duplicate
transactions), not just return `{ success: true }`. A real bank integration
later implements the same interface; the rest of the codebase doesn't change.

## Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Project foundation | **Done** |
| 2 | Database — wallet + ledger schema (double-entry-ready, not a mutable balance field) | **Done** (schema only, no business logic) |
| 3 | Authentication — merchant self-service signup/login, API keys, AdminUser oversight (superseded the original "internal service-to-service auth only" scope — see the pivot note above) | **Done, verified end-to-end** |
| 4 | Wallet + ledger business logic (real crediting/debiting via `postAdjustment`, admin-only until a real funding source exists) | **Done, verified end-to-end** |
| 5 | Mock Bank API (realistic simulated provider, own accounts/balances/transfers) | **Done, verified end-to-end** |
| 6 | Payment provider abstraction (`PaymentProvider` interface + `MockBankProvider`) | **Done, verified end-to-end** |
| 7 | Transfers (self-service deposits/withdrawals via the provider) | **Done, verified end-to-end** |
| 8 | Payroll payment batches (partial-failure aware) | **Done, verified end-to-end** |
| 9 | Webhooks (signature verification, idempotent processing) | **Done, verified end-to-end** |
| 10 | Reconciliation (SAPOK-internal vs. provider transaction matching) | Not started |
| 11 | Security hardening | Not started |
| 12 | Testing — 22 e2e tests covering auth, wallet adjustments, transfers, payroll batches (webhooks/API keys/admin/unit tests still outstanding) | **In progress, core paths done** |
| 13 | Documentation | Ongoing — this README is updated every phase |

## Design principles carried through every phase

- **Money is never a JS float.** Integer minor units (kobo, cents) in the
  database, currency stored explicitly per record — never assume NGN.
- **No mutable `balance` field as the source of truth.** Every financial
  operation creates an immutable ledger entry; balance is derived/cached,
  not the ground truth.
- **Tenant isolation is server-side, always.** `merchantId` is derived from
  authenticated context (JWT `sub` or the API key's owning merchant), never
  trusted blindly from a request body or URL param.
- **AdminUser is a separate identity from Merchant, always** — never a role
  flag on the tenant table.
- **Idempotency on every financial mutation** — funding, transfers, payouts,
  payroll payments all require an idempotency key; replaying a request must
  not duplicate a payment. (`Transaction.idempotencyKey` exists in the
  schema now; the enforcement logic lands with Phase 4's business logic.)
- **Audit everything sensitive** — wallet creation/funding, bank connection,
  transfer lifecycle, payroll batch lifecycle, reversals.

## Known gaps / deferred on purpose

- No refresh tokens (access-token-only, 15 min expiry).
- No password-reset flow for merchants/admin.
- No rate limiting specific to auth endpoints beyond the global throttler.
- Automated e2e coverage exists for auth, wallet adjustments, transfers,
  and payroll batches (see Phase 12 above) — webhooks, API keys, service
  provisioning, and admin endpoints are still only manually verified.
- `web/`'s lists (transactions, webhook events, payroll batches) load
  everything with no pagination/infinite-scroll — fine at today's data
  volumes, won't be once a merchant has thousands of transactions.
- `web/` re-fetches full lists on every mutation via React Query
  invalidation rather than optimistic updates — correct, but means every
  action has a visible round-trip before the UI reflects it.
- The `SERIALIZABLE`-isolation double-spend protection (both `postAdjustment`
  and `postProviderTransfer`) is verified by reasoning about Postgres's
  isolation guarantees, not by an actual concurrent-request load test —
  worth doing before this handles real money at any real volume. The
  compensating `reverseTransfer` path in `TransfersService.withdraw` (for
  when a withdrawal's authoritative wallet-balance check loses a race after
  the bank side already succeeded) is reasoned through the same way — not
  exercised by an actual forced race in a test.
- Mock Bank transfers resolve synchronously — no webhook-driven async
  settlement yet (that's Phase 9); a real provider integration will need
  that before this design holds up unchanged.
- No transfer amount limits, velocity checks, or fraud heuristics of any
  kind — anyone can deposit/withdraw any amount up to their balance,
  repeatedly, with no cooldown.
- Payroll batch items are processed **sequentially**, in-request, up to 500
  per batch — with the mock's artificial 150-400ms per-item delay, a
  full-size batch could take minutes and risks an HTTP timeout. A real
  implementation needs this to be a background job (BullMQ or similar)
  with the endpoint returning immediately and the batch resolving
  asynchronously — not built yet, deliberately deferred rather than
  guessed at.
- Webhook delivery (`fireEvent`) is also awaited **in-request**, inside the
  same call that posts the financial transaction — a slow or hanging
  merchant endpoint adds up to its 5-second timeout to the API response
  time. Same root cause and same fix as the payroll-batch gap above: this
  needs a background job queue (Redis/BullMQ, already provisioned but not
  wired up for queuing yet) so delivery attempts, retries with backoff, and
  the API response are fully decoupled — not built yet.

## Docs

`docs/` grows phase by phase. Expect `architecture.md`, `wallet.md`,
`ledger.md`, `payment-providers.md`, `mock-bank.md`, `reconciliation.md`,
`webhooks.md`, `payroll-payments.md`, `security.md`, `testing.md`.
