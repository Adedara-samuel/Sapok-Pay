export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface AccessTokenPayload {
  sub: string;
  scope: "merchant" | "admin";
  iat?: number;
  exp?: number;
}

export interface Wallet {
  id: string;
  merchantId: string;
  currency: string;
  balanceMinor: number;
  createdAt: string;
}

export type TransactionType = "CREDIT" | "DEBIT" | "TRANSFER" | "FUNDING" | "PAYOUT" | "REFUND" | "REVERSAL" | "ADJUSTMENT";
export type TransactionStatus = "PENDING" | "PROCESSING" | "SUCCESSFUL" | "FAILED" | "REVERSED";

export interface Transaction {
  id: string;
  walletId: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  amountMinor: number;
  currency: string;
  source: string | null;
  destination: string | null;
  provider: string | null;
  providerReference: string | null;
  idempotencyKey: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  merchantId: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  createdAt: string;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  status: "ACTIVE" | "REVOKED";
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreatedApiKey extends Pick<ApiKeySummary, "id" | "name" | "prefix" | "createdAt"> {
  rawKey: string;
}

export type PayrollBatchStatus = "PROCESSING" | "COMPLETED" | "PARTIALLY_FAILED" | "FAILED";
export type PayrollBatchItemStatus = "SUCCESSFUL" | "FAILED";

export interface PayrollBatchSummary {
  id: string;
  merchantId: string;
  reference: string;
  status: PayrollBatchStatus;
  totalAmountMinor: number;
  currency: string;
  createdAt: string;
  completedAt: string | null;
}

export interface PayrollBatchItem {
  id: string;
  recipientAccountNumber: string;
  recipientAccountName: string | null;
  recipientLabel: string | null;
  amountMinor: number;
  status: PayrollBatchItemStatus;
  failureReason: string | null;
  providerReference: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface PayrollBatch extends PayrollBatchSummary {
  items: PayrollBatchItem[];
}

export interface WebhookEndpoint {
  id: string;
  merchantId: string;
  url: string;
  secret: string;
  createdAt: string;
  updatedAt: string;
}

export type WebhookDeliveryStatus = "DELIVERED" | "FAILED";

export interface WebhookEvent {
  id: string;
  merchantId: string;
  endpointId: string;
  eventType: string;
  payload: unknown;
  status: WebhookDeliveryStatus;
  responseStatus: number | null;
  attempts: number;
  createdAt: string;
  lastAttemptAt: string;
}

export interface MerchantSummary {
  id: string;
  email: string;
  businessName: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  lastLoginAt: string | null;
  wallet: { currency: string; balanceMinor: number } | null;
  activeApiKeyCount: number;
}

export interface UsageSummary {
  totalEvents: number;
  byMerchant: { merchantId: string; businessName: string; requestCount: number }[];
}

export type SiteSettings = Record<string, string>;

export interface SiteSettingField {
  key: string;
  label: string;
  description: string;
  value: string;
  updatedAt: string | null;
}

export type BillingInterval = "MONTHLY" | "ANNUAL";

export interface Plan {
  key: string;
  name: string;
  priceMinor: number;
  billingInterval: BillingInterval;
  transactionFeeBps: number;
}

export interface PlanDetailed extends Plan {
  id: string;
  createdAt: string;
}

export type CompanySize = "SOLO" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export interface ContactSubmissionInput {
  firstName: string;
  lastName: string;
  workEmail: string;
  phone?: string;
  companyName: string;
  companyWebsite?: string;
  companySize: CompanySize;
  primaryProduct: string;
  country: string;
  monthlyPaymentVolume?: string;
  message: string;
  wantsUpdates: boolean;
}

export interface ContactSubmission extends ContactSubmissionInput {
  id: string;
  createdAt: string;
}
