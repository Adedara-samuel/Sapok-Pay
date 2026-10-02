import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundApiException } from "../common/exceptions/api.exception";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listMerchants() {
    const merchants = await this.prisma.merchant.findMany({
      include: { wallet: { include: { ledgerAccount: { include: { entries: true } } } }, apiKeys: true },
      orderBy: { createdAt: "desc" },
    });
    return merchants.map((merchant) => this.toMerchantSummary(merchant));
  }

  async getMerchant(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: { wallet: { include: { ledgerAccount: { include: { entries: true } } } }, apiKeys: true },
    });
    if (!merchant) throw new NotFoundApiException("Merchant not found", "MERCHANT_NOT_FOUND");
    return this.toMerchantSummary(merchant);
  }

  async getUsageSummary() {
    const [totalEvents, byMerchant] = await Promise.all([
      this.prisma.apiUsageEvent.count(),
      this.prisma.apiUsageEvent.groupBy({ by: ["merchantId"], _count: true }),
    ]);

    const merchants = await this.prisma.merchant.findMany({
      where: { id: { in: byMerchant.map((row) => row.merchantId) } },
      select: { id: true, businessName: true },
    });
    const nameById = new Map(merchants.map((merchant) => [merchant.id, merchant.businessName]));

    return {
      totalEvents,
      byMerchant: byMerchant.map((row) => ({
        merchantId: row.merchantId,
        businessName: nameById.get(row.merchantId) ?? "Unknown",
        requestCount: row._count,
      })),
    };
  }

  private balanceMinor(entries: { direction: string; amountMinor: number }[]): number {
    return entries.reduce((sum, entry) => (entry.direction === "CREDIT" ? sum + entry.amountMinor : sum - entry.amountMinor), 0);
  }

  private toMerchantSummary(merchant: {
    id: string;
    email: string;
    businessName: string;
    status: string;
    createdAt: Date;
    lastLoginAt: Date | null;
    wallet: { currency: string; ledgerAccount: { entries: { direction: string; amountMinor: number }[] } | null } | null;
    apiKeys: { status: string }[];
  }) {
    return {
      id: merchant.id,
      email: merchant.email,
      businessName: merchant.businessName,
      status: merchant.status,
      createdAt: merchant.createdAt.toISOString(),
      lastLoginAt: merchant.lastLoginAt?.toISOString() ?? null,
      wallet: merchant.wallet
        ? {
            currency: merchant.wallet.currency,
            balanceMinor: this.balanceMinor(merchant.wallet.ledgerAccount?.entries ?? []),
          }
        : null,
      activeApiKeyCount: merchant.apiKeys.filter((key) => key.status === "ACTIVE").length,
    };
  }
}
