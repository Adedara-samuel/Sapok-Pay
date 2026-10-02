import { Injectable } from "@nestjs/common";
import { randomUUID, createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ValidationApiException } from "../common/exceptions/api.exception";
import type { InitiateTransferParams, PaymentProvider, ProviderTransferResult, VerifyAccountResult } from "./payment-provider.interface";

/** A small fixed pool so verifying the same account number twice always resolves to the same name — a real bank's verify-account API is deterministic too. */
const MOCK_ACCOUNT_NAMES = ["Adaeze Okafor", "Chinedu Balogun", "Ngozi Umeh", "Emeka Yusuf", "Folake Adeyemi", "Tunde Bakare", "Amina Bello"];

/** ₦100,000 — a mock bank account starts funded so DEPOSIT flows (which debit the bank) have something real to test against. */
const STARTING_BALANCE_MINOR = 10_000_000;

@Injectable()
export class MockBankProviderService implements PaymentProvider {
  constructor(private readonly prisma: PrismaService) {}

  async verifyAccount(accountNumber: string): Promise<VerifyAccountResult> {
    await this.simulateNetworkDelay();
    if (!/^\d{10}$/.test(accountNumber)) {
      throw new ValidationApiException("accountNumber must be exactly 10 digits (NUBAN format)");
    }
    const firstByte = createHash("sha256").update(accountNumber).digest()[0] ?? 0;
    const accountName = MOCK_ACCOUNT_NAMES[firstByte % MOCK_ACCOUNT_NAMES.length] ?? MOCK_ACCOUNT_NAMES[0]!;
    return { accountNumber, accountName };
  }

  async getBalance(merchantId: string): Promise<{ balanceMinor: number; currency: string }> {
    const account = await this.getOrCreateAccount(merchantId);
    return { balanceMinor: account.balanceMinor, currency: account.currency };
  }

  async initiateTransfer(merchantId: string, params: InitiateTransferParams): Promise<ProviderTransferResult> {
    await this.simulateNetworkDelay();
    const reference = `MOCKBANK-${randomUUID()}`;
    const account = await this.getOrCreateAccount(merchantId);

    if (params.simulateFailure) {
      return this.recordFailure(account.id, reference, params, "Simulated failure (simulateFailure requested)");
    }
    if (params.direction === "DEBIT" && account.balanceMinor < params.amountMinor) {
      return this.recordFailure(account.id, reference, params, "Insufficient funds in the linked bank account");
    }

    await this.prisma.mockBankAccount.update({
      where: { id: account.id },
      data: { balanceMinor: params.direction === "DEBIT" ? { decrement: params.amountMinor } : { increment: params.amountMinor } },
    });
    await this.prisma.mockBankTransfer.create({
      data: { reference, bankAccountId: account.id, direction: params.direction, amountMinor: params.amountMinor, status: "SUCCESSFUL" },
    });

    return { reference, status: "SUCCESSFUL" };
  }

  async getTransferStatus(reference: string): Promise<ProviderTransferResult> {
    const transfer = await this.prisma.mockBankTransfer.findUnique({ where: { reference } });
    if (!transfer) throw new ValidationApiException("Unknown provider reference");
    return { reference: transfer.reference, status: transfer.status, failureReason: transfer.failureReason ?? undefined };
  }

  async reverseTransfer(reference: string): Promise<ProviderTransferResult> {
    await this.simulateNetworkDelay();
    const transfer = await this.prisma.mockBankTransfer.findUnique({ where: { reference } });
    if (!transfer) throw new ValidationApiException("Unknown provider reference");
    if (transfer.status !== "SUCCESSFUL") throw new ValidationApiException("Only a successful transfer can be reversed");

    const reversalReference = `MOCKBANK-REV-${randomUUID()}`;
    const reverseDirection = transfer.direction === "DEBIT" ? "CREDIT" : "DEBIT";

    await this.prisma.mockBankAccount.update({
      where: { id: transfer.bankAccountId },
      data: { balanceMinor: reverseDirection === "DEBIT" ? { decrement: transfer.amountMinor } : { increment: transfer.amountMinor } },
    });
    await this.prisma.mockBankTransfer.create({
      data: {
        reference: reversalReference,
        bankAccountId: transfer.bankAccountId,
        direction: reverseDirection,
        amountMinor: transfer.amountMinor,
        status: "SUCCESSFUL",
      },
    });

    return { reference: reversalReference, status: "SUCCESSFUL" };
  }

  private async recordFailure(
    bankAccountId: string,
    reference: string,
    params: InitiateTransferParams,
    reason: string,
  ): Promise<ProviderTransferResult> {
    await this.prisma.mockBankTransfer.create({
      data: { reference, bankAccountId, direction: params.direction, amountMinor: params.amountMinor, status: "FAILED", failureReason: reason },
    });
    return { reference, status: "FAILED", failureReason: reason };
  }

  private async getOrCreateAccount(merchantId: string) {
    const existing = await this.prisma.mockBankAccount.findUnique({ where: { merchantId } });
    if (existing) return existing;
    return this.prisma.mockBankAccount.create({
      data: { merchantId, accountNumber: this.generateAccountNumber(), balanceMinor: STARTING_BALANCE_MINOR },
    });
  }

  private generateAccountNumber(): string {
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
  }

  /** A real bank API has network latency — this keeps the mock honest about that instead of resolving instantly every time. */
  private async simulateNetworkDelay(): Promise<void> {
    const delayMs = 150 + Math.floor(Math.random() * 250);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
