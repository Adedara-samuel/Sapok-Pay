import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConflictApiException, NotFoundApiException } from "../common/exceptions/api.exception";
import { PAYMENT_PROVIDER, type PaymentProvider } from "../payments/payment-provider.interface";
import type { LinkBankAccountInput } from "./bank-accounts.validation";

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async list(merchantId: string) {
    const accounts = await this.prisma.merchantBankAccount.findMany({ where: { merchantId }, orderBy: { createdAt: "desc" } });
    return accounts.map((account) => this.toBankAccount(account));
  }

  async link(merchantId: string, input: LinkBankAccountInput) {
    const existing = await this.prisma.merchantBankAccount.findUnique({
      where: { merchantId_accountNumber: { merchantId, accountNumber: input.accountNumber } },
    });
    if (existing) throw new ConflictApiException("This bank account is already linked", "BANK_ACCOUNT_ALREADY_LINKED");

    // Verifying BEFORE creating the row means a bad/unverifiable account
    // number never gets persisted — matches how a real bank-linking flow
    // works (you don't save an account you couldn't confirm belongs to anyone).
    const verified = await this.provider.verifyAccount(input.accountNumber);

    const account = await this.prisma.merchantBankAccount.create({
      data: { merchantId, accountNumber: verified.accountNumber, accountName: verified.accountName, bankCode: input.bankCode },
    });

    await this.prisma.auditLog.create({
      data: {
        actorType: "MERCHANT",
        actorId: merchantId,
        merchantId,
        action: "BANK_ACCOUNT_LINKED",
        resourceType: "MerchantBankAccount",
        resourceId: account.id,
        metadata: { accountNumber: account.accountNumber, accountName: account.accountName },
      },
    });

    return this.toBankAccount(account);
  }

  async assertOwned(merchantId: string, id: string) {
    const account = await this.prisma.merchantBankAccount.findUnique({ where: { id } });
    if (!account || account.merchantId !== merchantId) {
      throw new NotFoundApiException("Bank account not found", "BANK_ACCOUNT_NOT_FOUND");
    }
    return account;
  }

  private toBankAccount(account: { id: string; merchantId: string; accountNumber: string; accountName: string; bankCode: string; createdAt: Date }) {
    return {
      id: account.id,
      merchantId: account.merchantId,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankCode: account.bankCode,
      createdAt: account.createdAt.toISOString(),
    };
  }
}
