import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/test-app";
import { linkBankAccount, signUpMerchant } from "./utils/fixtures";

describe("Transfers (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects an account number that isn't exactly 10 digits", async () => {
    const merchant = await signUpMerchant(app);
    const response = await request(app.getHttpServer())
      .post("/api/v1/wallets/bank-accounts")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .send({ accountNumber: "123" })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("verifying the same account number twice resolves to the same name (deterministic)", async () => {
    const merchantA = await signUpMerchant(app);
    const merchantB = await signUpMerchant(app);
    const accountNumber = "1234567890";

    const linkedA = await request(app.getHttpServer())
      .post("/api/v1/wallets/bank-accounts")
      .set("Authorization", `Bearer ${merchantA.accessToken}`)
      .send({ accountNumber })
      .expect(201);
    const linkedB = await request(app.getHttpServer())
      .post("/api/v1/wallets/bank-accounts")
      .set("Authorization", `Bearer ${merchantB.accessToken}`)
      .send({ accountNumber })
      .expect(201);

    // Same account number, two DIFFERENT merchants — both succeed
    // (accountNumber is unique per-merchant, not globally) and both
    // resolve to the same verified name, because a real bank's
    // verify-account API is deterministic too.
    expect(linkedA.body.data.accountName).toBe(linkedB.body.data.accountName);
  });

  it("rejects linking the same account number twice for the same merchant", async () => {
    const merchant = await signUpMerchant(app);
    await linkBankAccount(app, merchant.accessToken);
    const account = (await request(app.getHttpServer()).get("/api/v1/wallets/bank-accounts").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200)).body
      .data[0];

    const response = await request(app.getHttpServer())
      .post("/api/v1/wallets/bank-accounts")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .send({ accountNumber: account.accountNumber })
      .expect(409);
    expect(response.body.error.code).toBe("BANK_ACCOUNT_ALREADY_LINKED");
  });

  it("deposits successfully and credits the wallet", async () => {
    const merchant = await signUpMerchant(app);
    const bankAccount = await linkBankAccount(app, merchant.accessToken);

    const deposit = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/deposits")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ bankAccountId: bankAccount.id, amountMinor: 250_000 })
      .expect(201);
    expect(deposit.body.data.status).toBe("SUCCESSFUL");
    expect(deposit.body.data.type).toBe("FUNDING");

    const wallet = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200);
    expect(wallet.body.data.balanceMinor).toBe(250_000);
  });

  it("a deposit with simulateFailure fails without moving any money", async () => {
    const merchant = await signUpMerchant(app);
    const bankAccount = await linkBankAccount(app, merchant.accessToken);

    const deposit = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/deposits")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ bankAccountId: bankAccount.id, amountMinor: 100_000, simulateFailure: true })
      .expect(201);
    expect(deposit.body.data.status).toBe("FAILED");

    const wallet = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200);
    expect(wallet.body.data.balanceMinor).toBe(0);
  });

  it("rejects a withdrawal larger than the wallet balance with 422, before ever touching the bank", async () => {
    const merchant = await signUpMerchant(app);
    const bankAccount = await linkBankAccount(app, merchant.accessToken);

    const response = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/withdrawals")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ bankAccountId: bankAccount.id, amountMinor: 500_000 })
      .expect(422);
    expect(response.body.error.code).toBe("INSUFFICIENT_FUNDS");
  });

  it("withdraws successfully within balance and debits the wallet", async () => {
    const merchant = await signUpMerchant(app);
    const bankAccount = await linkBankAccount(app, merchant.accessToken);

    await request(app.getHttpServer())
      .post("/api/v1/wallets/me/deposits")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ bankAccountId: bankAccount.id, amountMinor: 500_000 })
      .expect(201);

    const withdrawal = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/withdrawals")
      .set("Authorization", `Bearer ${merchant.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ bankAccountId: bankAccount.id, amountMinor: 200_000 })
      .expect(201);
    expect(withdrawal.body.data.status).toBe("SUCCESSFUL");
    expect(withdrawal.body.data.type).toBe("PAYOUT");

    const wallet = await request(app.getHttpServer()).get("/api/v1/wallets/me").set("Authorization", `Bearer ${merchant.accessToken}`).expect(200);
    expect(wallet.body.data.balanceMinor).toBe(300_000);
  });

  it("a merchant cannot use another merchant's bankAccountId (tenant isolation)", async () => {
    const merchantA = await signUpMerchant(app);
    const merchantB = await signUpMerchant(app);
    const accountOwnedByA = await linkBankAccount(app, merchantA.accessToken);

    const response = await request(app.getHttpServer())
      .post("/api/v1/wallets/me/deposits")
      .set("Authorization", `Bearer ${merchantB.accessToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ bankAccountId: accountOwnedByA.id, amountMinor: 100_000 })
      .expect(404);
    expect(response.body.error.code).toBe("BANK_ACCOUNT_NOT_FOUND");
  });
});
