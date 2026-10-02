import { Inject, Injectable } from "@nestjs/common";
import { InsufficientFundsException } from "../common/exceptions/api.exception";
import { PAYMENT_PROVIDER, type PaymentProvider } from "../payments/payment-provider.interface";
import { BankAccountsService } from "../bank-accounts/bank-accounts.service";
import { WalletsService } from "../wallets/wallets.service";
import type { InitiateTransferInput } from "./transfers.validation";

const PROVIDER_NAME = "MOCK_BANK";

@Injectable()
export class TransfersService {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly bankAccounts: BankAccountsService,
    private readonly wallets: WalletsService,
  ) {}

  /** Bank → wallet. The bank is debited first (where insufficient-funds-at-the-bank naturally surfaces); crediting a wallet afterwards can't itself fail on balance grounds, so no compensating action is needed here. */
  async deposit(merchantId: string, input: InitiateTransferInput, idempotencyKey: string) {
    const existing = await this.wallets.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const bankAccount = await this.bankAccounts.assertOwned(merchantId, input.bankAccountId);
    const result = await this.provider.initiateTransfer(merchantId, {
      amountMinor: input.amountMinor,
      direction: "DEBIT",
      simulateFailure: input.simulateFailure,
    });

    return this.wallets.postProviderTransfer({
      merchantId,
      idempotencyKey,
      type: "FUNDING",
      amountMinor: input.amountMinor,
      status: result.status,
      provider: PROVIDER_NAME,
      providerReference: result.reference,
      source: bankAccount.accountNumber,
      failureReason: result.failureReason,
    });
  }

  /**
   * Wallet → bank. The wallet balance is checked optimistically before
   * calling the provider (avoids paying the bank when the wallet obviously
   * can't cover it), then re-checked authoritatively — inside a
   * Serializable transaction — when posting. If that authoritative check
   * loses a race the bank has already been credited, so the bank side is
   * reversed rather than left inconsistent with the wallet debit that
   * never happened — a compensating action, not just an error return.
   */
  async withdraw(merchantId: string, input: InitiateTransferInput, idempotencyKey: string) {
    const existing = await this.wallets.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const bankAccount = await this.bankAccounts.assertOwned(merchantId, input.bankAccountId);

    const wallet = await this.wallets.getByMerchantId(merchantId);
    if (wallet.balanceMinor < input.amountMinor) {
      throw new InsufficientFundsException({ availableMinor: wallet.balanceMinor, requestedMinor: input.amountMinor });
    }

    const result = await this.provider.initiateTransfer(merchantId, {
      amountMinor: input.amountMinor,
      direction: "CREDIT",
      simulateFailure: input.simulateFailure,
    });

    if (result.status === "FAILED") {
      return this.wallets.postProviderTransfer({
        merchantId,
        idempotencyKey,
        type: "PAYOUT",
        amountMinor: input.amountMinor,
        status: "FAILED",
        provider: PROVIDER_NAME,
        providerReference: result.reference,
        destination: bankAccount.accountNumber,
        failureReason: result.failureReason,
      });
    }

    try {
      return await this.wallets.postProviderTransfer({
        merchantId,
        idempotencyKey,
        type: "PAYOUT",
        amountMinor: input.amountMinor,
        status: "SUCCESSFUL",
        provider: PROVIDER_NAME,
        providerReference: result.reference,
        destination: bankAccount.accountNumber,
      });
    } catch (error) {
      if (error instanceof InsufficientFundsException) {
        await this.provider.reverseTransfer(result.reference);
      }
      throw error;
    }
  }
}
