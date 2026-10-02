import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { InsufficientFundsException, NotFoundApiException, ValidationApiException } from "../common/exceptions/api.exception";
import { PAYMENT_PROVIDER, type PaymentProvider } from "../payments/payment-provider.interface";
import { WalletsService } from "../wallets/wallets.service";
import { WebhooksService } from "../webhooks/webhooks.service";
import type { CreatePayrollBatchInput } from "./payroll-batches.validation";
import type { PayrollBatch, PayrollBatchItem, PayrollBatchStatus } from "@prisma/client";

const PROVIDER_NAME = "MOCK_BANK";

type BatchWithItems = PayrollBatch & { items: PayrollBatchItem[] };

@Injectable()
export class PayrollBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly wallets: WalletsService,
    private readonly webhooks: WebhooksService,
  ) {}

  async list(merchantId: string) {
    const batches = await this.prisma.payrollBatch.findMany({ where: { merchantId }, orderBy: { createdAt: "desc" } });
    return batches.map((batch) => this.toBatchSummary(batch));
  }

  async findById(merchantId: string, id: string) {
    const batch = await this.getOwned(merchantId, id);
    return this.toBatch(batch);
  }

  /**
   * Processes every item independently — one bad account or one item that
   * exhausts the remaining wallet balance partway through does NOT abort
   * the rest of the batch. The batch's final status reflects the mix:
   * COMPLETED (all succeeded), FAILED (none did), or PARTIALLY_FAILED.
   */
  async create(merchantId: string, input: CreatePayrollBatchInput, idempotencyKey: string): Promise<ReturnType<PayrollBatchesService["toBatch"]>> {
    const existing = await this.prisma.payrollBatch.findUnique({ where: { idempotencyKey }, include: { items: true } });
    if (existing) return this.toBatch(existing);

    const totalAmountMinor = input.items.reduce((sum, item) => sum + item.amountMinor, 0);
    const reference = `PRB-${randomUUID()}`;

    const batch = await this.prisma.payrollBatch.create({
      data: { merchantId, reference, totalAmountMinor, idempotencyKey, status: "PROCESSING" },
    });

    for (const [index, item] of input.items.entries()) {
      await this.processItem(merchantId, batch.id, item, `${idempotencyKey}:item:${index}`);
    }

    const withItems = await this.prisma.payrollBatch.findUniqueOrThrow({ where: { id: batch.id }, include: { items: true } });
    const successCount = withItems.items.filter((item) => item.status === "SUCCESSFUL").length;
    const status: PayrollBatchStatus =
      successCount === withItems.items.length ? "COMPLETED" : successCount === 0 ? "FAILED" : "PARTIALLY_FAILED";

    const updated = await this.prisma.payrollBatch.update({
      where: { id: batch.id },
      data: { status, completedAt: new Date() },
      include: { items: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorType: "MERCHANT",
        actorId: merchantId,
        merchantId,
        action: "PAYROLL_BATCH_PROCESSED",
        resourceType: "PayrollBatch",
        resourceId: batch.id,
        metadata: { totalItems: withItems.items.length, successCount, failedCount: withItems.items.length - successCount },
      },
    });

    const result = this.toBatch(updated);
    await this.webhooks.fireEvent(merchantId, "payroll_batch.completed", result);
    return result;
  }

  private async processItem(
    merchantId: string,
    batchId: string,
    item: CreatePayrollBatchInput["items"][number],
    itemIdempotencyKey: string,
  ): Promise<void> {
    let recipientAccountName: string | undefined;
    try {
      const verified = await this.provider.verifyAccount(item.recipientAccountNumber);
      recipientAccountName = verified.accountName;
    } catch (error) {
      const message = error instanceof ValidationApiException ? error.message : "Could not verify recipient account";
      await this.prisma.payrollBatchItem.create({
        data: {
          batchId,
          recipientAccountNumber: item.recipientAccountNumber,
          recipientLabel: item.recipientLabel,
          amountMinor: item.amountMinor,
          status: "FAILED",
          failureReason: message,
        },
      });
      return;
    }

    const providerResult = await this.provider.initiateTransfer(merchantId, {
      amountMinor: item.amountMinor,
      direction: "CREDIT",
      simulateFailure: item.simulateFailure,
    });

    if (providerResult.status === "FAILED") {
      await this.prisma.payrollBatchItem.create({
        data: {
          batchId,
          recipientAccountNumber: item.recipientAccountNumber,
          recipientAccountName,
          recipientLabel: item.recipientLabel,
          amountMinor: item.amountMinor,
          status: "FAILED",
          failureReason: providerResult.failureReason,
          providerReference: providerResult.reference,
        },
      });
      return;
    }

    try {
      const transaction = await this.wallets.postProviderTransfer({
        merchantId,
        idempotencyKey: itemIdempotencyKey,
        type: "PAYOUT",
        amountMinor: item.amountMinor,
        status: "SUCCESSFUL",
        provider: PROVIDER_NAME,
        providerReference: providerResult.reference,
        destination: item.recipientAccountNumber,
      });

      await this.prisma.payrollBatchItem.create({
        data: {
          batchId,
          recipientAccountNumber: item.recipientAccountNumber,
          recipientAccountName,
          recipientLabel: item.recipientLabel,
          amountMinor: item.amountMinor,
          status: "SUCCESSFUL",
          providerReference: providerResult.reference,
          transactionId: transaction.id,
        },
      });
    } catch (error) {
      if (!(error instanceof InsufficientFundsException)) throw error;

      // The bank side already succeeded but the wallet couldn't actually
      // cover this item (e.g. an earlier item in the same batch already
      // spent the balance) — reverse the bank side rather than leave the
      // two systems inconsistent, same compensating-action pattern as
      // TransfersService.withdraw.
      await this.provider.reverseTransfer(providerResult.reference);
      await this.prisma.payrollBatchItem.create({
        data: {
          batchId,
          recipientAccountNumber: item.recipientAccountNumber,
          recipientAccountName,
          recipientLabel: item.recipientLabel,
          amountMinor: item.amountMinor,
          status: "FAILED",
          failureReason: "Insufficient wallet balance",
          providerReference: providerResult.reference,
        },
      });
    }
  }

  private async getOwned(merchantId: string, id: string): Promise<BatchWithItems> {
    const batch = await this.prisma.payrollBatch.findUnique({ where: { id }, include: { items: true } });
    if (!batch || batch.merchantId !== merchantId) {
      throw new NotFoundApiException("Payroll batch not found", "PAYROLL_BATCH_NOT_FOUND");
    }
    return batch;
  }

  private toBatchSummary(batch: PayrollBatch) {
    return {
      id: batch.id,
      merchantId: batch.merchantId,
      reference: batch.reference,
      status: batch.status,
      totalAmountMinor: batch.totalAmountMinor,
      currency: batch.currency,
      createdAt: batch.createdAt.toISOString(),
      completedAt: batch.completedAt?.toISOString() ?? null,
    };
  }

  private toBatch(batch: BatchWithItems) {
    return {
      ...this.toBatchSummary(batch),
      items: batch.items.map((item) => ({
        id: item.id,
        recipientAccountNumber: item.recipientAccountNumber,
        recipientAccountName: item.recipientAccountName,
        recipientLabel: item.recipientLabel,
        amountMinor: item.amountMinor,
        status: item.status,
        failureReason: item.failureReason,
        providerReference: item.providerReference,
        transactionId: item.transactionId,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}
