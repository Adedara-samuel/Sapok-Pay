import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** The real plan catalog every merchant is assigned from at signup — see AuthService.merchantSignup. */
const PLANS = [
  { key: "free", name: "Free", priceMinor: 0, billingInterval: "MONTHLY" as const, transactionFeeBps: 150 },
  { key: "growth", name: "Growth", priceMinor: 1_500_000, billingInterval: "MONTHLY" as const, transactionFeeBps: 100 },
  { key: "scale", name: "Scale", priceMinor: 5_000_000, billingInterval: "MONTHLY" as const, transactionFeeBps: 50 },
];

/**
 * Seeds the one AdminUser (platform operator) account and the subscription
 * plan catalog. Merchants are never seeded — they sign up for real through
 * POST /auth/merchant/signup.
 */
async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@sapokpay.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "SAPOK Pay Admin" },
  });

  console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
  console.log(`Password: ${password} — local dev only, rotate before any real deployment.`);

  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({ where: { key: plan.key }, update: plan, create: plan });
  }
  console.log(`Seeded ${PLANS.length} subscription plans: ${PLANS.map((p) => p.key).join(", ")}`);

  // Backfill: merchants that signed up before Subscription existed still need
  // a real row — everyone lands on Free until an admin upgrades them.
  const freePlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: "free" } });
  const unsubscribed = await prisma.merchant.findMany({ where: { subscription: null }, select: { id: true } });
  if (unsubscribed.length > 0) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await prisma.subscription.createMany({
      data: unsubscribed.map((merchant) => ({ merchantId: merchant.id, planId: freePlan.id, currentPeriodStart: now, currentPeriodEnd: periodEnd })),
    });
    console.log(`Backfilled ${unsubscribed.length} pre-existing merchant(s) onto the Free plan.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
