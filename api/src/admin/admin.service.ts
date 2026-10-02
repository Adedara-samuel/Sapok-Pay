import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { ConflictApiException, NotFoundApiException } from "../common/exceptions/api.exception";
import type { CreateUserInput, UpdatePlanInput } from "./admin.validation";

function addOneMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  return result;
}

/** null means "no prior-period baseline to compare against" — never a fabricated percentage. */
function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

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

  // ---- Dashboard -----------------------------------------------------

  async getDashboardSummary() {
    const now = new Date();
    const period30Start = new Date(now);
    period30Start.setDate(period30Start.getDate() - 30);
    const period60Start = new Date(now);
    period60Start.setDate(period60Start.getDate() - 60);

    const [creditTotal, debitTotal, creditBefore30, debitBefore30, payoutAgg, successfulCount, pendingPayoutsCount, recentSuccessful, priorSuccessful, recentPayout, priorPayout] =
      await Promise.all([
        this.prisma.ledgerEntry.aggregate({ where: { direction: "CREDIT" }, _sum: { amountMinor: true } }),
        this.prisma.ledgerEntry.aggregate({ where: { direction: "DEBIT" }, _sum: { amountMinor: true } }),
        this.prisma.ledgerEntry.aggregate({ where: { direction: "CREDIT", createdAt: { lt: period30Start } }, _sum: { amountMinor: true } }),
        this.prisma.ledgerEntry.aggregate({ where: { direction: "DEBIT", createdAt: { lt: period30Start } }, _sum: { amountMinor: true } }),
        this.prisma.transaction.aggregate({ where: { type: "PAYOUT", status: "SUCCESSFUL" }, _sum: { amountMinor: true }, _count: true }),
        this.prisma.transaction.count({ where: { status: "SUCCESSFUL" } }),
        this.prisma.payrollBatch.count({ where: { status: "PROCESSING" } }),
        this.prisma.transaction.count({ where: { status: "SUCCESSFUL", createdAt: { gte: period30Start } } }),
        this.prisma.transaction.count({ where: { status: "SUCCESSFUL", createdAt: { gte: period60Start, lt: period30Start } } }),
        this.prisma.transaction.aggregate({ where: { type: "PAYOUT", status: "SUCCESSFUL", createdAt: { gte: period30Start } }, _sum: { amountMinor: true } }),
        this.prisma.transaction.aggregate({ where: { type: "PAYOUT", status: "SUCCESSFUL", createdAt: { gte: period60Start, lt: period30Start } }, _sum: { amountMinor: true } }),
      ]);

    const totalWalletBalanceMinor = (creditTotal._sum.amountMinor ?? 0) - (debitTotal._sum.amountMinor ?? 0);
    const balance30dAgo = (creditBefore30._sum.amountMinor ?? 0) - (debitBefore30._sum.amountMinor ?? 0);

    return {
      totalWalletBalanceMinor,
      totalPayoutsMinor: payoutAgg._sum.amountMinor ?? 0,
      totalPayoutsCount: payoutAgg._count,
      successfulTransactionsCount: successfulCount,
      pendingPayoutsCount,
      deltas: {
        walletBalancePct: pctChange(totalWalletBalanceMinor, balance30dAgo),
        payoutsPct: pctChange(recentPayout._sum.amountMinor ?? 0, priorPayout._sum.amountMinor ?? 0),
        successfulTransactionsPct: pctChange(recentSuccessful, priorSuccessful),
        pendingPayoutsPct: null,
      },
    };
  }

  async getTransactionSeries(range: "7d" | "30d" | "90d") {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.$queryRaw<{ day: Date; count: bigint; totalminor: bigint | null }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count, SUM("amountMinor")::bigint AS totalminor
      FROM transactions
      WHERE "createdAt" >= ${since} AND status = 'SUCCESSFUL'
      GROUP BY day
      ORDER BY day ASC
    `;

    return rows.map((row) => ({ date: row.day.toISOString().slice(0, 10), count: Number(row.count), totalMinor: Number(row.totalminor ?? 0) }));
  }

  async getRecentActivity(limit = 10) {
    const [signups, transactions] = await Promise.all([
      this.prisma.merchant.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { id: true, businessName: true, createdAt: true } }),
      this.prisma.transaction.findMany({
        where: { status: "SUCCESSFUL" },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, type: true, amountMinor: true, createdAt: true, wallet: { select: { merchant: { select: { businessName: true } } } } },
      }),
    ]);

    const events = [
      ...signups.map((merchant) => ({
        id: `signup-${merchant.id}`,
        kind: "ORGANIZATION_CREATED" as const,
        label: `${merchant.businessName} signed up`,
        amountMinor: null as number | null,
        createdAt: merchant.createdAt,
      })),
      ...transactions.map((transaction) => ({
        id: `txn-${transaction.id}`,
        kind: transaction.type,
        label: `${transaction.wallet.merchant.businessName} — ${transaction.type.toLowerCase()}`,
        amountMinor: transaction.amountMinor,
        createdAt: transaction.createdAt,
      })),
    ];

    return events
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }));
  }

  // ---- Organizations & Users ------------------------------------------

  async listOrganizations() {
    const merchants = await this.prisma.merchant.findMany({
      include: {
        wallet: { include: { ledgerAccount: { include: { entries: true } } } },
        apiKeys: true,
        users: true,
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return merchants.map((merchant) => ({
      ...this.toMerchantSummary(merchant),
      memberCount: merchant.users.length + 1,
      plan: merchant.subscription ? { key: merchant.subscription.plan.key, name: merchant.subscription.plan.name, status: merchant.subscription.status } : null,
    }));
  }

  async listUsers() {
    const [merchants, users] = await Promise.all([
      this.prisma.merchant.findMany({ select: { id: true, email: true, businessName: true, status: true, lastLoginAt: true, createdAt: true } }),
      this.prisma.user.findMany({ include: { merchant: { select: { businessName: true } } } }),
    ]);

    const owners = merchants.map((merchant) => ({
      id: merchant.id,
      email: merchant.email,
      name: merchant.businessName,
      role: "OWNER" as const,
      status: merchant.status,
      organizationId: merchant.id,
      organizationName: merchant.businessName,
      lastLoginAt: merchant.lastLoginAt?.toISOString() ?? null,
      createdAt: merchant.createdAt.toISOString(),
    }));

    const members = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      organizationId: user.merchantId,
      organizationName: user.merchant.businessName,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    }));

    return [...owners, ...members].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createUser(merchantId: string, input: CreateUserInput) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundApiException("Organization not found", "ORGANIZATION_NOT_FOUND");

    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictApiException("A user with this email already exists", "EMAIL_TAKEN");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({ data: { merchantId, email: input.email, passwordHash, name: input.name, role: input.role } });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      organizationId: merchantId,
      organizationName: merchant.businessName,
      lastLoginAt: null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // ---- Subscriptions ---------------------------------------------------

  async listSubscriptionPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { priceMinor: "asc" } });
  }

  async updatePlanPricing(planId: string, input: UpdatePlanInput) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundApiException("Plan not found", "PLAN_NOT_FOUND");
    return this.prisma.subscriptionPlan.update({ where: { id: planId }, data: input });
  }

  async listSubscriptions() {
    const subscriptions = await this.prisma.subscription.findMany({
      include: { merchant: { select: { businessName: true, email: true } }, plan: true },
      orderBy: { createdAt: "desc" },
    });

    return subscriptions.map((subscription) => ({
      id: subscription.id,
      organizationId: subscription.merchantId,
      organizationName: subscription.merchant.businessName,
      organizationEmail: subscription.merchant.email,
      plan: { key: subscription.plan.key, name: subscription.plan.name, priceMinor: subscription.plan.priceMinor, billingInterval: subscription.plan.billingInterval },
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    }));
  }

  async updateMerchantSubscription(merchantId: string, planKey: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundApiException("Organization not found", "ORGANIZATION_NOT_FOUND");

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { key: planKey } });
    if (!plan) throw new NotFoundApiException("Plan not found", "PLAN_NOT_FOUND");

    const subscription = await this.prisma.subscription.upsert({
      where: { merchantId },
      update: { planId: plan.id },
      create: { merchantId, planId: plan.id, currentPeriodEnd: addOneMonth(new Date()) },
      include: { plan: true, merchant: { select: { businessName: true } } },
    });

    return {
      id: subscription.id,
      organizationId: subscription.merchantId,
      organizationName: subscription.merchant.businessName,
      plan: { key: subscription.plan.key, name: subscription.plan.name },
      status: subscription.status,
    };
  }

  // ---- Notifications ------------------------------------------------------

  /**
   * `unreadCount` is the real count of NEW (unresponded) contact submissions
   * — a genuine "needs attention" signal, not a decorative badge number.
   * The feed itself merges that with signups from the last 24 hours.
   */
  async getNotifications() {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const [newSubmissions, recentSignups] = await Promise.all([
      this.prisma.contactSubmission.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 10 }),
      this.prisma.merchant.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, businessName: true, createdAt: true } }),
    ]);

    const notifications = [
      ...newSubmissions.map((submission) => ({
        id: `contact-${submission.id}`,
        kind: "CONTACT_SUBMISSION" as const,
        label: `New message from ${submission.firstName} ${submission.lastName} (${submission.companyName})`,
        href: "/admin/contact-submissions",
        createdAt: submission.createdAt,
      })),
      ...recentSignups.map((merchant) => ({
        id: `signup-${merchant.id}`,
        kind: "ORGANIZATION_CREATED" as const,
        label: `${merchant.businessName} signed up`,
        href: `/admin/merchants/${merchant.id}`,
        createdAt: merchant.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      unreadCount: newSubmissions.length,
      notifications: notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    };
  }

  // ---- Platform-wide transactions & payouts ----------------------------

  async listTransactionsPlatformWide(limit = 50) {
    const transactions = await this.prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { wallet: { include: { merchant: { select: { businessName: true } } } } },
    });

    return transactions.map((transaction) => ({
      id: transaction.id,
      reference: transaction.reference,
      type: transaction.type,
      status: transaction.status,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      organizationId: transaction.wallet.merchantId,
      organizationName: transaction.wallet.merchant.businessName,
      createdAt: transaction.createdAt.toISOString(),
    }));
  }

  async listPayoutsPlatformWide(limit = 50) {
    const batches = await this.prisma.payrollBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { merchant: { select: { businessName: true } }, items: true },
    });

    return batches.map((batch) => ({
      id: batch.id,
      reference: batch.reference,
      status: batch.status,
      totalAmountMinor: batch.totalAmountMinor,
      currency: batch.currency,
      itemCount: batch.items.length,
      organizationId: batch.merchantId,
      organizationName: batch.merchant.businessName,
      createdAt: batch.createdAt.toISOString(),
      completedAt: batch.completedAt?.toISOString() ?? null,
    }));
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
