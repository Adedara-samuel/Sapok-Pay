import { useAuthStore } from "./auth-store";
import type {
  ApiKeySummary,
  AuthTokens,
  BankAccount,
  CreatedApiKey,
  MerchantSummary,
  PayrollBatch,
  PayrollBatchSummary,
  Transaction,
  UsageSummary,
  Wallet,
  WebhookEndpoint,
  WebhookEvent,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_SAPOK_PAY_API_URL ?? "http://localhost:4100";

export class SapokPayApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SapokPayApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = (await response.json()) as { success: true; data: T } | { success: false; error: { code: string; message: string; details?: Record<string, unknown> } };

  if (!body.success) {
    throw new SapokPayApiError(body.error.code, body.error.message, response.status, body.error.details);
  }
  return body.data;
}

export const apiClient = {
  health: (): Promise<{ status: string; dependencies: { database: string; redis: string } }> => request("/api/v1/health"),

  auth: {
    /** One login for every user — merchant or admin — the backend figures out which. */
    login: (email: string, password: string): Promise<AuthTokens> =>
      request("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

    merchantSignup: (email: string, password: string, businessName: string): Promise<AuthTokens> =>
      request("/api/v1/auth/merchant/signup", { method: "POST", body: JSON.stringify({ email, password, businessName }) }),

    merchantLogin: (email: string, password: string): Promise<AuthTokens> =>
      request("/api/v1/auth/merchant/login", { method: "POST", body: JSON.stringify({ email, password }) }),

    adminLogin: (email: string, password: string): Promise<AuthTokens> =>
      request("/api/v1/auth/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  },

  wallet: {
    getMine: (): Promise<Wallet> => request("/api/v1/wallets/me"),
    listTransactions: (): Promise<Transaction[]> => request("/api/v1/wallets/me/transactions"),
  },

  bankAccounts: {
    list: (): Promise<BankAccount[]> => request("/api/v1/wallets/bank-accounts"),
    link: (accountNumber: string): Promise<BankAccount> =>
      request("/api/v1/wallets/bank-accounts", { method: "POST", body: JSON.stringify({ accountNumber }) }),
  },

  transfers: {
    deposit: (bankAccountId: string, amountMinor: number, idempotencyKey: string): Promise<Transaction> =>
      request("/api/v1/wallets/me/deposits", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ bankAccountId, amountMinor }),
      }),

    withdraw: (bankAccountId: string, amountMinor: number, idempotencyKey: string): Promise<Transaction> =>
      request("/api/v1/wallets/me/withdrawals", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ bankAccountId, amountMinor }),
      }),
  },

  payrollBatches: {
    list: (): Promise<PayrollBatchSummary[]> => request("/api/v1/wallets/me/payroll-batches"),
    findById: (id: string): Promise<PayrollBatch> => request(`/api/v1/wallets/me/payroll-batches/${id}`),
    create: (
      items: { recipientAccountNumber: string; amountMinor: number; recipientLabel?: string }[],
      idempotencyKey: string,
    ): Promise<PayrollBatch> =>
      request("/api/v1/wallets/me/payroll-batches", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ items }),
      }),
  },

  apiKeys: {
    list: (): Promise<ApiKeySummary[]> => request("/api/v1/api-keys"),
    create: (name: string): Promise<CreatedApiKey> => request("/api/v1/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
    revoke: (id: string): Promise<{ revoked: true }> => request(`/api/v1/api-keys/${id}`, { method: "DELETE" }),
  },

  webhooks: {
    getEndpoint: (): Promise<WebhookEndpoint> => request("/api/v1/webhooks/endpoint"),
    setEndpoint: (url: string): Promise<WebhookEndpoint> => request("/api/v1/webhooks/endpoint", { method: "PUT", body: JSON.stringify({ url }) }),
    rotateSecret: (): Promise<WebhookEndpoint> => request("/api/v1/webhooks/endpoint/rotate-secret", { method: "POST" }),
    listEvents: (): Promise<WebhookEvent[]> => request("/api/v1/webhooks/events"),
    redeliver: (id: string): Promise<WebhookEvent> => request(`/api/v1/webhooks/events/${id}/redeliver`, { method: "POST" }),
  },

  admin: {
    listMerchants: (): Promise<MerchantSummary[]> => request("/api/v1/admin/merchants"),
    getMerchant: (id: string): Promise<MerchantSummary> => request(`/api/v1/admin/merchants/${id}`),
    getUsage: (): Promise<UsageSummary> => request("/api/v1/admin/usage"),
    listMerchantTransactions: (id: string): Promise<Transaction[]> => request(`/api/v1/admin/merchants/${id}/transactions`),
    postAdjustment: (
      merchantId: string,
      input: { amountMinor: number; direction: "CREDIT" | "DEBIT"; description: string },
      idempotencyKey: string,
    ): Promise<Transaction> =>
      request(`/api/v1/admin/merchants/${merchantId}/wallet/adjustments`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(input),
      }),
  },
};

export * from "./types";
