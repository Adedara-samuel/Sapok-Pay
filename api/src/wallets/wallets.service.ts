import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { InsufficientFundsException, NotFoundApiException } from "../common/exceptions/api.exception";
import { WebhooksService } from "../webhooks/webhooks.service";
import type { PostAdjustmentInput } from "./wallets.validation";

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {}

  async getByMerchantId(merchantId: string) {
    const wallet = await this.findWalletOrThrow(merchantId);
    const balanceMinor = await this.getBalanceMinor(this.prisma, wallet.ledgerAccount!.id);

    return {
      id: wallet.id,
      merchantId: wallet.merchantId,
      currency: wallet.currency,
      balanceMinor,
      createdAt: wallet.createdAt.toISOString(),
    };
  }

  async listTransactions(merchantId: string) {
    const wallet = await this.findWalletOrThrow(merchantId);
    const transactions = await this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
    });
    return transactions.map((transaction) => this.toTransaction(transaction));
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
    return existing ? this.toTransaction(existing) : null;
  }

  /**
   * Posts a Transaction (and, on success, its double-entry LedgerEntry)
   * originating from a PaymentProvider result — the Phase 5/6+ analogue of
   * postAdjustment, driven by a verified bank transfer instead of an admin
   * action. FUNDING credits the wallet (money arrived from the bank);
   * PAYOUT debits it (money left to the bank) — same Serializable-isolation
   * double-spend protection as postAdjustment's DEBIT path.
   */
  async postProviderTransfer(params: {
    merchantId: string;
    idempotencyKey: string;
    type: "FUNDING" | "PAYOUT";
    amountMinor: number;
    status: "SUCCESSFUL" | "FAILED";
    provider: string;
    providerReference: string;
    source?: string;
    destination?: string;
    failureReason?: string;
  }) {
    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
    if (existing) return this.toTransaction(existing);

    const wallet = await this.findWalletOrThrow(params.merchantId);
    const reference = `TXN-${randomUUID()}`;

    if (params.status === "FAILED") {
      const created = await this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          reference,
          type: params.type,
          status: "FAILED",
          amountMinor: params.amountMinor,
          currency: wallet.currency,
          source: params.source,
          destination: params.destination,
          provider: params.provider,
          providerReference: params.providerReference,
          idempotencyKey: params.idempotencyKey,
          metadata: params.failureReason ? { failureReason: params.failureReason } : undefined,
        },
      });
      const failedTransaction = this.toTransaction(created);
      await this.webhooks.fireEvent(params.merchantId, "transaction.failed", failedTransaction);
      return failedTransaction;
    }

    const direction = params.type === "FUNDING" ? "CREDIT" : "DEBIT";

    const transaction = await this.prisma.$transaction(
      async (tx) => {
        const balanceMinor = await this.getBalanceMinor(tx, wallet.ledgerAccount!.id);
        if (direction === "DEBIT" && balanceMinor < params.amountMinor) {
          throw new InsufficientFundsException({ availableMinor: balanceMinor, requestedMinor: params.amountMinor });
        }

        const created = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            reference,
            type: params.type,
            status: "SUCCESSFUL",
            amountMinor: params.amountMinor,
            currency: wallet.currency,
            source: params.source,
            destination: params.destination,
            provider: params.provider,
            providerReference: params.providerReference,
            idempotencyKey: params.idempotencyKey,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            ledgerAccountId: wallet.ledgerAccount!.id,
            transactionId: created.id,
            direction,
            amountMinor: params.amountMinor,
            currency: wallet.currency,
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const successfulTransaction = this.toTransaction(transaction);
    await this.webhooks.fireEvent(params.merchantId, "transaction.successful", successfulTransaction);
    return successfulTransaction;
  }

  /**
   * Admin-only for now — there's no bank/provider until Phase 5/6 to verify
   * a merchant's own funding claim, so a real double-entry posting exists
   * now, gated behind an authorized human, rather than letting anyone credit
   * their own wallet by calling an API. Phase 5+ triggers this same posting
   * logic from a verified bank transfer instead of an admin action.
   */
  async postAdjustment(merchantId: string, input: PostAdjustmentInput, idempotencyKey: string, actorAdminId: string) {
    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey } });
    if (existing) return this.toTransaction(existing);

    const wallet = await this.findWalletOrThrow(merchantId);
    const reference = `ADJ-${randomUUID()}`;

    const transaction = await this.prisma.$transaction(
      async (tx) => {
        // Re-read the balance INSIDE the transaction, at Serializable
        // isolation — Postgres will abort one of two concurrent conflicting
        // debits with a serialization error rather than let both succeed
        // against a stale balance (the double-spend race this exists to
        // close).
        const balanceMinor = await this.getBalanceMinor(tx, wallet.ledgerAccount!.id);
        if (input.direction === "DEBIT" && balanceMinor < input.amountMinor) {
          throw new InsufficientFundsException({ availableMinor: balanceMinor, requestedMinor: input.amountMinor });
        }

        const created = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            reference,
            type: "ADJUSTMENT",
            status: "SUCCESSFUL",
            amountMinor: input.amountMinor,
            currency: wallet.currency,
            idempotencyKey,
            metadata: { description: input.description },
          },
        });

        await tx.ledgerEntry.create({
          data: {
            ledgerAccountId: wallet.ledgerAccount!.id,
            transactionId: created.id,
            direction: input.direction,
            amountMinor: input.amountMinor,
            currency: wallet.currency,
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.prisma.auditLog.create({
      data: {
        actorType: "ADMIN_USER",
        actorId: actorAdminId,
        merchantId,
        action: "WALLET_ADJUSTED",
        resourceType: "Transaction",
        resourceId: transaction.id,
        metadata: { direction: input.direction, amountMinor: input.amountMinor, description: input.description },
      },
    });

    return this.toTransaction(transaction);
  }

  private async findWalletOrThrow(merchantId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { merchantId }, include: { ledgerAccount: true } });
    if (!wallet || !wallet.ledgerAccount) throw new NotFoundApiException("Wallet not found", "WALLET_NOT_FOUND");
    return wallet;
  }

  /** Computed via aggregation, never a mutable counter — see schema.prisma's LedgerEntry doc comment. */
  private async getBalanceMinor(client: Prisma.TransactionClient | PrismaService, ledgerAccountId: string): Promise<number> {
    const totals = await client.ledgerEntry.groupBy({
      by: ["direction"],
      where: { ledgerAccountId },
      _sum: { amountMinor: true },
    });
    const credit = totals.find((row) => row.direction === "CREDIT")?._sum.amountMinor ?? 0;
    const debit = totals.find((row) => row.direction === "DEBIT")?._sum.amountMinor ?? 0;
    return credit - debit;
  }

  private toTransaction(transaction: {
    id: string;
    walletId: string;
    reference: string;
    type: string;
    status: string;
    amountMinor: number;
    currency: string;
    source: string | null;
    destination: string | null;
    provider: string | null;
    providerReference: string | null;
    idempotencyKey: string | null;
    metadata: unknown;
    createdAt: Date;
  }) {
    return {
      id: transaction.id,
      walletId: transaction.walletId,
      reference: transaction.reference,
      type: transaction.type,
      status: transaction.status,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      source: transaction.source,
      destination: transaction.destination,
      provider: transaction.provider,
      providerReference: transaction.providerReference,
      idempotencyKey: transaction.idempotencyKey,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt.toISOString(),
    };
  }
}
