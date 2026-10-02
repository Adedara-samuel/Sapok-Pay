import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/test-app";
import { loginAdmin, signUpMerchant } from "./utils/fixtures";

describe("Wallet adjustments (e2e)", () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await loginAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function getMerchantId(accessToken: string): Promise<string> {
    // No direct "who am I" merchant-id endpoint exists; the wallet's
    // merchantId field is the reliable way to get it in a test context.
    const response = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
    return response.body.data.merchantId;
  }

  it("credits a wallet and the balance reflects it immediately", async () => {
    const merchant = await signUpMerchant(app);
    const merchantId = await getMerchantId(merchant.accessToken);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/merchants/${merchantId}/wallet/adjustments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ amountMinor: 500_000, direction: "CREDIT", description: "Test credit" })
      .expect(201);

    const wallet = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200);
    expect(wallet.body.data.balanceMinor).toBe(500_000);
  });

  it("replaying the same Idempotency-Key returns the ORIGINAL transaction and does not double-credit", async () => {
    const merchant = await signUpMerchant(app);
    const merchantId = await getMerchantId(merchant.accessToken);
    const idempotencyKey = randomUUID();

    const first = await request(app.getHttpServer())
      .post(`/api/v1/admin/merchants/${merchantId}/wallet/adjustments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({ amountMinor: 300_000, direction: "CREDIT", description: "First attempt" })
      .expect(201);

    // Same key, DIFFERENT amount and description — if idempotency worked,
    // none of that matters: the original transaction comes back unchanged.
    const replay = await request(app.getHttpServer())
      .post(`/api/v1/admin/merchants/${merchantId}/wallet/adjustments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({ amountMinor: 999_999, direction: "CREDIT", description: "Should be ignored" })
      .expect(201);

    expect(replay.body.data.id).toBe(first.body.data.id);
    expect(replay.body.data.amountMinor).toBe(300_000);

    const wallet = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200);
    expect(wallet.body.data.balanceMinor).toBe(300_000);
  });

  it("rejects a debit larger than the current balance with 422", async () => {
    const merchant = await signUpMerchant(app);
    const merchantId = await getMerchantId(merchant.accessToken);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/merchants/${merchantId}/wallet/adjustments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ amountMinor: 100_000, direction: "CREDIT", description: "Fund before over-debit attempt" })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/admin/merchants/${merchantId}/wallet/adjustments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ amountMinor: 200_000, direction: "DEBIT", description: "Should fail" })
      .expect(422);
    expect(response.body.error.code).toBe("INSUFFICIENT_FUNDS");

    // Balance must be untouched by the rejected debit.
    const wallet = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200);
    expect(wallet.body.data.balanceMinor).toBe(100_000);
  });

  it("rejects a request with no Idempotency-Key header at all", async () => {
    const merchant = await signUpMerchant(app);
    const merchantId = await getMerchantId(merchant.accessToken);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/admin/merchants/${merchantId}/wallet/adjustments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amountMinor: 100_000, direction: "CREDIT", description: "No idempotency key" })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
