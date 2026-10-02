import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/test-app";
import { linkBankAccount, signUpMerchant } from "./utils/fixtures";

describe("Payroll batches (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function fundWallet(accessToken: string, amountMinor: number): Promise<void> {
    const bankAccount = await linkBankAccount(app, accessToken);
    await request(app.getHttpServer())
      .post("/api/v1/wallets/me/deposits")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ bankAccountId: bankAccount.id, amountMinor })
      .expect(201);
  }

  it("processes a mixed batch independently — one bad row does not block the others, and the run is PARTIALLY_FAILED", async () => {
    const merchant = await signUpMerchant(app);
    await fundWallet(merchant.accessToken, 1_000_000);

    const response = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/payroll-batches")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({
        items: [
          { recipientAccountNumber: "2223334445", amountMinor: 300_000, recipientLabel: "Employee A" },
          { recipientAccountNumber: "bad-acct", amountMinor: 50_000, recipientLabel: "Employee B (bad account)" },
          { recipientAccountNumber: "3334445556", amountMinor: 50_000, recipientLabel: "Employee C (bank rejects)", simulateFailure: true },
          // Exceeds the 700,000 left in the wallet after Employee A's item
          // posts — this must trigger the compensating reverseTransfer path,
          // not just a generic failure.
          { recipientAccountNumber: "4445556667", amountMinor: 800_000, recipientLabel: "Employee D (exceeds remaining wallet)" },
        ],
      })
      .expect(201);

    const batch = response.body.data;
    expect(batch.status).toBe("PARTIALLY_FAILED");
    expect(batch.items).toHaveLength(4);

    const byLabel = new Map(batch.items.map((item: { recipientLabel: string; status: string; failureReason: string | null }) => [item.recipientLabel, item]));
    expect(byLabel.get("Employee A")).toMatchObject({ status: "SUCCESSFUL" });
    expect(byLabel.get("Employee B (bad account)")).toMatchObject({ status: "FAILED" });
    expect(byLabel.get("Employee C (bank rejects)")).toMatchObject({ status: "FAILED", failureReason: expect.stringContaining("Simulated") });
    expect(byLabel.get("Employee D (exceeds remaining wallet)")).toMatchObject({ status: "FAILED", failureReason: "Insufficient wallet balance" });

    // Only Employee A's 300,000 should have actually left the wallet — the
    // other three items must not have moved any money.
    const wallet = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200);
    expect(wallet.body.data.balanceMinor).toBe(700_000);
  });

  it("replaying the same batch Idempotency-Key returns the original batch and does not reprocess", async () => {
    const merchant = await signUpMerchant(app);
    await fundWallet(merchant.accessToken, 500_000);
    const idempotencyKey = randomUUID();

    const first = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/payroll-batches")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({ items: [{ recipientAccountNumber: "5556667778", amountMinor: 200_000, recipientLabel: "Employee X" }] })
      .expect(201);

    const replay = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/payroll-batches")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", idempotencyKey)
      // Deliberately different items — if idempotency works, this is ignored entirely.
      .send({ items: [{ recipientAccountNumber: "9998887776", amountMinor: 1, recipientLabel: "Should not run" }] })
      .expect(201);

    expect(replay.body.data.id).toBe(first.body.data.id);
    expect(replay.body.data.items).toHaveLength(1);
    expect(replay.body.data.items[0].recipientLabel).toBe("Employee X");

    const wallet = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200);
    expect(wallet.body.data.balanceMinor).toBe(300_000);
  });

  it("a fully successful batch is COMPLETED and a fully failed one is FAILED", async () => {
    const merchant = await signUpMerchant(app);
    await fundWallet(merchant.accessToken, 200_000);

    const completed = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/payroll-batches")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ recipientAccountNumber: "1112223334", amountMinor: 50_000 }] })
      .expect(201);
    expect(completed.body.data.status).toBe("COMPLETED");

    const failed = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/payroll-batches")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ recipientAccountNumber: "2223334445", amountMinor: 10_000, simulateFailure: true }] })
      .expect(201);
    expect(failed.body.data.status).toBe("FAILED");
  });

  it("a merchant cannot see another merchant's payroll batch", async () => {
    const merchantA = await signUpMerchant(app);
    const merchantB = await signUpMerchant(app);
    await fundWallet(merchantA.accessToken, 200_000);

    const batch = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/payroll-batches")
      .set("Authorization", `Bearer ${merchantA.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ recipientAccountNumber: "1112223334", amountMinor: 50_000 }] })
      .expect(201);

    const listForB = await request(app.getHttpServer()).get("/api/v1/wallets/me/payroll-batches").set("Authorization", `Bearer ${merchantB.accessToken}`).expect(200);
    expect(listForB.body.data).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/api/v1/wallets/me/payroll-batches/${batch.body.data.id}`)
      .set("Authorization", `Bearer ${merchantB.accessToken}`)
      .expect(404);
  });

  it("rejects a batch request with no Idempotency-Key header", async () => {
    const merchant = await signUpMerchant(app);
    const response = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/payroll-batches")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .send({ items: [{ recipientAccountNumber: "1112223334", amountMinor: 50_000 }] })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
