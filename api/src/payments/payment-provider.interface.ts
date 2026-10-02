export interface VerifyAccountResult {
  accountNumber: string;
  accountName: string;
}

export interface ProviderTransferResult {
  reference: string;
  status: "SUCCESSFUL" | "FAILED";
  failureReason?: string;
}

export interface InitiateTransferParams {
  amountMinor: number;
  /**
   * Effect on the BANK side: DEBIT pulls money out of the bank account
   * (funding SAPOK Pay from the bank — a DEPOSIT), CREDIT pays money into
   * it (a payout from SAPOK Pay to the bank — a WITHDRAWAL).
   */
  direction: "DEBIT" | "CREDIT";
  /** Deterministic failure injection for testing — never present in a real provider's params. */
  simulateFailure?: boolean;
}

/**
 * SAPOK Pay's business logic must never depend directly on a specific
 * bank/payment provider — everything goes through this interface.
 * `MockBankProviderService` (Phase 5/6) is the only implementation during
 * development, and it must behave like a real provider (realistic delays,
 * realistic failure modes), not just return `{ success: true }`. A real
 * bank integration later implements the same interface; the rest of the
 * codebase — TransfersService, BankAccountsService — doesn't change.
 *
 * `reconcile()` from the original design sketch (see README) is
 * deliberately NOT part of this interface yet — reconciliation (Phase 10)
 * needs a "list provider transactions since X" shape that can't be
 * meaningfully designed until that phase is actually built; adding a
 * guessed signature now would just have to be redesigned later.
 */
export interface PaymentProvider {
  verifyAccount(accountNumber: string): Promise<VerifyAccountResult>;
  getBalance(merchantId: string): Promise<{ balanceMinor: number; currency: string }>;
  initiateTransfer(merchantId: string, params: InitiateTransferParams): Promise<ProviderTransferResult>;
  getTransferStatus(reference: string): Promise<ProviderTransferResult>;
  reverseTransfer(reference: string): Promise<ProviderTransferResult>;
}

/** DI token — inject this, never the concrete MockBankProviderService, so swapping in a real provider later is a one-line change in PaymentsModule. */
export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
