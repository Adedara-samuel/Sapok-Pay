import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";

/** A fresh, collision-free email per call — tests run against a shared database, never a per-test-reset one, so uniqueness is what keeps them independent. */
export function uniqueEmail(label: string): string {
  return `${label}-${randomUUID()}@example.com`;
}

export async function signUpMerchant(app: INestApplication, businessName = "Test Merchant"): Promise<{ accessToken: string; email: string }> {
  const email = uniqueEmail("merchant");
  const response = await request(app.getHttpServer())
    .post("/api/v1/auth/merchant/signup")
    .send({ email, password: "MerchantPass123!", businessName })
    .expect(201);
  return { accessToken: response.body.data.accessToken, email };
}

export async function loginAdmin(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer())
    .post("/api/v1/auth/admin/login")
    .send({ email: "admin@sapokpay.com", password: "ChangeMe123!" })
    .expect(200);
  return response.body.data.accessToken;
}

/** Links a fresh, valid-format bank account for the given merchant token and returns its id. */
export async function linkBankAccount(app: INestApplication, accessToken: string): Promise<{ id: string; accountNumber: string; accountName: string }> {
  const accountNumber = String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999));
  const response = await request(app.getHttpServer())
    .post("/api/v1/wallets/bank-accounts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ accountNumber })
    .expect(201);
  return response.body.data;
}
