import { z } from "zod";

/**
 * SERVICE_AUTH_SECRET, PAYMENT_PROVIDER, MOCK_BANK_URL and WEBHOOK_SECRET
 * aren't consumed by anything yet (Phase 1 is scaffold-only) — they're
 * validated now so later phases (3: service auth, 5: mock bank, 9: webhooks)
 * don't need a config-schema change, just a config-consumer change.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SAPOK_PAY_PORT: z.coerce.number().int().positive().default(4100),
  API_GLOBAL_PREFIX: z.string().default("api/v1"),
  CORS_ORIGINS: z.string().default("http://localhost:4110"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  SERVICE_AUTH_SECRET: z.string().min(16, "SERVICE_AUTH_SECRET must be at least 16 characters"),

  PAYMENT_PROVIDER: z.enum(["mock"]).default("mock"),
  MOCK_BANK_URL: z.string().default("http://localhost:4101"),
  WEBHOOK_SECRET: z.string().min(16, "WEBHOOK_SECRET must be at least 16 characters"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  SEED_ADMIN_EMAIL: z.string().email().default("admin@sapokpay.com"),
  SEED_ADMIN_PASSWORD: z.string().default("ChangeMe123!"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  return result.data;
}
