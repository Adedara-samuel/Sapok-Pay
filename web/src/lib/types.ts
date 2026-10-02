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

export type ContactSubmissionStatus = "NEW" | "RESPONDED";

export interface ContactSubmission extends ContactSubmissionInput {
  id: string;
  status: ContactSubmissionStatus;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  kind: "CONTACT_SUBMISSION" | "ORGANIZATION_CREATED";
  label: string;
  href: string;
  createdAt: string;
}

export interface NotificationsFeed {
  unreadCount: number;
  notifications: AdminNotification[];
}

export interface DashboardSummary {
  totalWalletBalanceMinor: number;
  totalPayoutsMinor: number;
  totalPayoutsCount: number;
  successfulTransactionsCount: number;
  pendingPayoutsCount: number;
  deltas: {
    walletBalancePct: number | null;
    payoutsPct: number | null;
    successfulTransactionsPct: number | null;
    pendingPayoutsPct: number | null;
  };
}

export interface TransactionSeriesPoint {
  date: string;
  count: number;
  totalMinor: number;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  label: string;
  amountMinor: number | null;
  createdAt: string;
}

export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED";
export type OrgUserRole = "OWNER" | "MEMBER";
export type OrgUserStatus = "ACTIVE" | "DISABLED";

export interface OrganizationSummary extends MerchantSummary {
  memberCount: number;
  plan: { key: string; name: string; status: SubscriptionStatus } | null;
}

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: OrgUserRole;
  /** Owners carry MerchantStatus (ACTIVE/SUSPENDED); members carry OrgUserStatus (ACTIVE/DISABLED) — admin.service.ts merges both into one list. */
  status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  organizationId: string;
  organizationName: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SubscriptionSummary {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationEmail: string;
  plan: { key: string; name: string; priceMinor: number; billingInterval: BillingInterval };
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface PlatformTransaction {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  amountMinor: number;
  currency: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
}

export interface PlatformPayout {
  id: string;
  reference: string;
  status: PayrollBatchStatus;
  totalAmountMinor: number;
  currency: string;
  itemCount: number;
  organizationId: string;
  organizationName: string;
  createdAt: string;
  completedAt: string | null;
}
