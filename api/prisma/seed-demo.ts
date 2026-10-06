import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Dev-only realistic demo data — merchants, transactions, payroll batches,
 * users, contact submissions, API usage. Deliberately NOT part of seed.ts
 * (which stays safe to run against any environment, including a real one);
 * this script is never meant to run against production.
 *
 * Every transaction is generated in chronological order with a running
 * balance check — a debit is never allowed to exceed what's actually
 * accumulated so far, the same constraint the real postAdjustment/
 * postProviderTransfer flows enforce (InsufficientFundsException). That's
 * what keeps the resulting balance history smooth and believable instead of
 * a flat line with an artificial correction spike at the end.
 */

const DEMO_BUSINESSES = [
  "Lagos Fresh Market",
  "Naija Threads Boutique",
  "Zenith Logistics Co",
  "Savanna Foods Ltd",
  "BrightPath Tutors",
  "Coastal Furniture Works",
  "Abuja Tech Hub",
  "Ikeja Auto Parts",
];

const RECIPIENT_NAMES = ["Adaeze Okonkwo", "Tunde Bakare", "Chiamaka Eze", "Ibrahim Musa", "Funmilayo Adeyemi", "Emeka Nwosu", "Ngozi Chukwu", "Segun Ogunleye"];

const CONTACT_FIRST = ["Chinwe", "David", "Amaka", "Yusuf", "Blessing", "Tobi", "Hauwa", "Kelechi"];
const CONTACT_LAST = ["Umeh", "Eze", "Balogun", "Abubakar", "Nwachukwu", "Fashola", "Garba", "Obi"];
const CONTACT_PRODUCTS = ["E-commerce storefront", "Marketplace for freelancers", "SaaS billing platform", "Logistics booking app", "Fintech wallet app"];
const COMPANY_SIZES = ["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"] as const;
const PAYMENT_VOLUMES = ["Under ₦1,000,000/mo", "₦1,000,000 – ₦10,000,000/mo", "₦10,000,000 – ₦100,000,000/mo", "Not sure yet"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)] as T;
}

function daysAgo(days: number, hour = randomInt(8, 18)): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

async function wipeExistingDemoData(): Promise<void> {
  const result = await prisma.merchant.deleteMany({ where: { email: { endsWith: "@demo.sapokpay.com" } } });
  await prisma.contactSubmission.deleteMany({ where: { workEmail: { contains: "@example.com" } } });
  if (result.count > 0) console.log(`Cleared ${result.count} previously-seeded demo merchant(s) before regenerating.`);
}

async function main(): Promise<void> {
  await wipeExistingDemoData();

  const freePlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: "free" } });
  const growthPlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: "growth" } });
  const scalePlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { key: "scale" } });
  const plans = [freePlan, growthPlan, scalePlan];
  const passwordHash = await bcrypt.hash("DemoPass123!", 12);

  let merchantsCreated = 0;
  let transactionsCreated = 0;
  let payrollBatchesCreated = 0;
  let usersCreated = 0;

  for (const businessName of DEMO_BUSINESSES) {
    const email = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@demo.sapokpay.com`;
    const signupDaysAgo = randomInt(45, 89);
    const createdAt = daysAgo(signupDaysAgo);
    const plan = pick(plans);

    const merchant = await prisma.$transaction(async (tx) => {
      const created = await tx.merchant.create({ data: { email, passwordHash, businessName, createdAt, lastLoginAt: daysAgo(randomInt(0, 4)) } });
      const wallet = await tx.wallet.create({ data: { merchantId: created.id, currency: "NGN", createdAt } });
      const ledgerAccount = await tx.ledgerAccount.create({ data: { walletId: wallet.id, currency: "NGN", createdAt } });

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await tx.subscription.create({ data: { merchantId: created.id, planId: plan.id, currentPeriodEnd: periodEnd, createdAt } });

      const bankAccount = await tx.merchantBankAccount.create({
        data: { merchantId: created.id, accountNumber: String(randomInt(1000000000, 9999999999)), accountName: businessName, createdAt },
      });

      return { ...created, walletId: wallet.id, ledgerAccountId: ledgerAccount.id, bankAccountId: bankAccount.id };
    });
    merchantsCreated++;

    // Build a chronological list of "events" (regular deposits/withdrawals,
    // plus payroll batches) across the merchant's history, oldest first, then
    // post them in order while tracking a running balance — a debit is only
    // ever posted if there's actually enough to cover it, exactly like the
    // real app. This is what keeps the balance curve smooth and realistic.
    type PlannedEvent = { date: Date; kind: "deposit" | "withdrawal" | "payroll"; amountMinor?: number; batchItemCount?: number };
    const events: PlannedEvent[] = [];

    const regularCount = randomInt(10, 24);
    for (let i = 0; i < regularCount; i++) {
      const isDeposit = Math.random() > 0.4;
      events.push({
        date: daysAgo(randomInt(0, Math.min(signupDaysAgo - 1, 59))),
        kind: isDeposit ? "deposit" : "withdrawal",
        amountMinor: randomInt(5_000, 350_000) * 100,
      });
    }

    const batchCount = randomInt(1, 4);
    for (let b = 0; b < batchCount; b++) {
      events.push({ date: daysAgo(randomInt(0, Math.min(signupDaysAgo - 1, 55))), kind: "payroll", batchItemCount: randomInt(2, 8) });
    }

    // A guaranteed early deposit so there's always a float to work with —
    // real merchants fund their wallet before trying to pay anyone out.
    events.push({ date: daysAgo(Math.min(signupDaysAgo - 1, randomInt(40, 55))), kind: "deposit", amountMinor: randomInt(300_000, 1_200_000) * 100 });
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const pendingBatch: { status: "PROCESSING" | "COMPLETED" } | null = Math.random() > 0.55 ? { status: "PROCESSING" } : null;
    let batchIndexSeen = 0;

    for (const event of events) {
      if (event.kind === "deposit" && event.amountMinor) {
        const transaction = await prisma.transaction.create({
          data: {
            walletId: merchant.walletId,
            reference: `TXN-${randomUUID()}`,
            type: "FUNDING",
            status: "SUCCESSFUL",
            amountMinor: event.amountMinor,
            currency: "NGN",
            provider: "mock-bank",
            providerReference: `MOCK-${randomUUID()}`,
            idempotencyKey: randomUUID(),
            createdAt: event.date,
            updatedAt: event.date,
          },
        });
        await prisma.ledgerEntry.create({
          data: { ledgerAccountId: merchant.ledgerAccountId, transactionId: transaction.id, direction: "CREDIT", amountMinor: event.amountMinor, currency: "NGN", createdAt: event.date },
        });
        runningBalance += event.amountMinor;
        transactionsCreated++;
      } else if (event.kind === "withdrawal" && event.amountMinor) {
        const amount = Math.min(event.amountMinor, Math.floor(runningBalance * 0.6));
        if (amount < 1_000_00) continue; // not enough float yet — skip rather than overdraw
        const transaction = await prisma.transaction.create({
          data: {
            walletId: merchant.walletId,
            reference: `TXN-${randomUUID()}`,
            type: "PAYOUT",
            status: Math.random() > 0.08 ? "SUCCESSFUL" : "FAILED",
            amountMinor: amount,
            currency: "NGN",
            provider: "mock-bank",
            providerReference: `MOCK-${randomUUID()}`,
            idempotencyKey: randomUUID(),
            createdAt: event.date,
            updatedAt: event.date,
          },
        });
        if (transaction.status === "SUCCESSFUL") {
          await prisma.ledgerEntry.create({
            data: { ledgerAccountId: merchant.ledgerAccountId, transactionId: transaction.id, direction: "DEBIT", amountMinor: amount, currency: "NGN", createdAt: event.date },
          });
          runningBalance -= amount;
        }
        transactionsCreated++;
      } else if (event.kind === "payroll" && event.batchItemCount) {
        batchIndexSeen++;
        const isLast = batchIndexSeen === batchCount;
        const status = isLast && pendingBatch ? pendingBatch.status : "COMPLETED";
        const batchItemCount = event.batchItemCount;

        const items = Array.from({ length: batchItemCount }, () => ({
          recipientAccountNumber: String(randomInt(1000000000, 9999999999)),
          recipientAccountName: pick(RECIPIENT_NAMES),
          recipientLabel: pick(RECIPIENT_NAMES),
          amountMinor: Math.min(randomInt(10_000, 150_000) * 100, Math.max(100_00, Math.floor(runningBalance / batchItemCount))),
        }));
        const totalAmountMinor = items.reduce((sum, item) => sum + item.amountMinor, 0);
        if (totalAmountMinor > runningBalance) continue; // genuinely can't afford this batch right now — skip it

        const batch = await prisma.payrollBatch.create({
          data: {
            merchantId: merchant.id,
            reference: `PAYROLL-${randomUUID()}`,
            status,
            totalAmountMinor,
            currency: "NGN",
            idempotencyKey: randomUUID(),
            createdAt: event.date,
            completedAt: status === "COMPLETED" ? event.date : null,
          },
        });

        for (const [itemIndex, item] of items.entries()) {
          // Each recipient in a batch is paid out a few minutes apart, not all
          // at the exact same instant — a real disbursement run processes
          // items one at a time.
          const itemDate = new Date(event.date.getTime() + itemIndex * randomInt(60_000, 240_000));
          const itemTxn =
            status === "COMPLETED"
              ? await prisma.transaction.create({
                  data: {
                    walletId: merchant.walletId,
                    reference: `TXN-${randomUUID()}`,
                    type: "PAYOUT",
                    status: "SUCCESSFUL",
                    amountMinor: item.amountMinor,
                    currency: "NGN",
                    idempotencyKey: randomUUID(),
                    createdAt: itemDate,
                    updatedAt: itemDate,
                  },
                })
              : null;

          if (itemTxn) {
            await prisma.ledgerEntry.create({
              data: { ledgerAccountId: merchant.ledgerAccountId, transactionId: itemTxn.id, direction: "DEBIT", amountMinor: item.amountMinor, currency: "NGN", createdAt: itemDate },
            });
            runningBalance -= item.amountMinor;
          }

          await prisma.payrollBatchItem.create({
            data: { batchId: batch.id, status: "SUCCESSFUL", ...item, transactionId: itemTxn?.id, createdAt: itemDate },
          });
        }
        payrollBatchesCreated++;
      }
    }

    // One invited member per merchant, about half the time.
    if (Math.random() > 0.4) {
      const memberEmail = `member-${randomUUID().slice(0, 8)}@demo.sapokpay.com`;
      await prisma.user.create({
        data: { merchantId: merchant.id, email: memberEmail, passwordHash, name: pick(RECIPIENT_NAMES), role: "MEMBER", createdAt: daysAgo(randomInt(0, 30)) },
      });
      usersCreated++;
    }

    // An API key and a handful of usage events, for the Usage page.
    const apiKey = await prisma.apiKey.create({
      data: { merchantId: merchant.id, name: "Production backend", prefix: `sapok_live_${randomUUID().slice(0, 4)}`, keyHash: randomUUID(), createdAt, lastUsedAt: daysAgo(randomInt(0, 3)) },
    });
    const eventCount = randomInt(5, 60);
    await prisma.apiUsageEvent.createMany({
      data: Array.from({ length: eventCount }, () => ({
        merchantId: merchant.id,
        apiKeyId: apiKey.id,
        method: pick(["GET", "POST"]),
        path: pick(["/wallets/me", "/wallets/me/transactions", "/wallets/me/deposits", "/wallets/bank-accounts"]),
        statusCode: Math.random() > 0.08 ? 200 : 422,
        createdAt: daysAgo(randomInt(0, 60)),
      })),
    });
  }

  console.log(`Seeded ${merchantsCreated} demo merchants, ${transactionsCreated} transactions, ${payrollBatchesCreated} payroll batches, ${usersCreated} invited users.`);

  // Contact submissions — a mix of new and already-responded, each with a
  // genuinely unique email so re-running this script stays idempotent.
  let contactsCreated = 0;
  for (let i = 0; i < 10; i++) {
    const firstName = pick(CONTACT_FIRST);
    const lastName = pick(CONTACT_LAST);
    const workEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;
    const responded = Math.random() > 0.5;
    const createdAt = daysAgo(randomInt(0, 20));
    await prisma.contactSubmission.create({
      data: {
        firstName,
        lastName,
        workEmail,
        phone: Math.random() > 0.4 ? `+234 80${randomInt(10000000, 99999999)}` : null,
        companyName: pick(DEMO_BUSINESSES),
        companyWebsite: Math.random() > 0.5 ? "example.com" : null,
        companySize: pick(COMPANY_SIZES),
        primaryProduct: pick(CONTACT_PRODUCTS),
        country: "Nigeria",
        monthlyPaymentVolume: pick(PAYMENT_VOLUMES),
        message: "We're evaluating payment providers for our platform and would like to know more about your transfer and payroll APIs.",
        wantsUpdates: Math.random() > 0.5,
        status: responded ? "RESPONDED" : "NEW",
        adminResponse: responded ? "Thanks for reaching out — I've sent over our API docs and a sandbox key to get you started. Let us know if you have questions!" : null,
        respondedAt: responded ? daysAgo(randomInt(0, 15)) : null,
        createdAt,
      },
    });
    contactsCreated++;
  }
  console.log(`Seeded ${contactsCreated} contact submissions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
