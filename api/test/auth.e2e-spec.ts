import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/test-app";
import { uniqueEmail } from "./utils/fixtures";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("signs a merchant up with a wallet created in the same transaction", async () => {
    const email = uniqueEmail("signup");

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/merchant/signup")
      .send({ email, password: "MerchantPass123!", businessName: "Acme Traders" })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toEqual(expect.any(String));

    // The wallet must exist and be usable immediately — signup and wallet
    // creation are meant to be one atomic step, not "signup, then a wallet
    // shows up eventually."
    const walletResponse = await request(app.getHttpServer())
      .get("/api/v1/wallets/me")
      .set("Authorization", `Bearer ${response.body.data.accessToken}`)
      .expect(200);
    expect(walletResponse.body.data.balanceMinor).toBe(0);
  });

  it("rejects a duplicate signup email", async () => {
    const email = uniqueEmail("dup");
    await request(app.getHttpServer()).post("/api/v1/auth/merchant/signup").send({ email, password: "MerchantPass123!", businessName: "First" }).expect(201);

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/merchant/signup")
      .send({ email, password: "AnotherPass123!", businessName: "Second" })
      .expect(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects a wrong password without revealing whether the account exists", async () => {
    const email = uniqueEmail("login");
    await request(app.getHttpServer()).post("/api/v1/auth/merchant/signup").send({ email, password: "CorrectPass123!", businessName: "Login Test" }).expect(201);

    const wrongPassword = await request(app.getHttpServer()).post("/api/v1/auth/merchant/login").send({ email, password: "WrongPassword!" }).expect(401);
    const unknownEmail = await request(app.getHttpServer())
      .post("/api/v1/auth/merchant/login")
      .send({ email: uniqueEmail("never-signed-up"), password: "WrongPassword!" })
      .expect(401);

    // Same error code either way — the point of the timing-safe-dummy-hash
    // pattern is that these two cases are indistinguishable to the caller.
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("logs in successfully with the correct password", async () => {
    const email = uniqueEmail("login-ok");
    await request(app.getHttpServer()).post("/api/v1/auth/merchant/signup").send({ email, password: "CorrectPass123!", businessName: "Login OK" }).expect(201);

    const response = await request(app.getHttpServer()).post("/api/v1/auth/merchant/login").send({ email, password: "CorrectPass123!" }).expect(200);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it("rejects a merchant token on an admin-only route and vice versa", async () => {
    const signup = await request(app.getHttpServer())
      .post("/api/v1/auth/merchant/signup")
      .send({ email: uniqueEmail("scope"), password: "MerchantPass123!", businessName: "Scope Test" })
      .expect(201);
    const merchantToken = signup.body.data.accessToken;

    const adminLogin = await request(app.getHttpServer()).post("/api/v1/auth/admin/login").send({ email: "admin@sapokpay.com", password: "ChangeMe123!" }).expect(200);
    const adminToken = adminLogin.body.data.accessToken;

    await request(app.getHttpServer()).get("/api/v1/admin/merchants").set("Authorization", `Bearer ${merchantToken}`).expect(403);
    await request(app.getHttpServer()).get("/api/v1/api-keys").set("Authorization", `Bearer ${adminToken}`).expect(403);
  });
});
