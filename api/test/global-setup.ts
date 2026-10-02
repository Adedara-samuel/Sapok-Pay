import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Runs once before the whole e2e run (not per-worker, unlike env.setup.ts):
 * brings the DEDICATED test database (never the dev one — see .env.test's
 * comment) up to the current schema and seeds the one AdminUser tests need
 * to authenticate as. Idempotent — `migrate deploy` no-ops on an
 * up-to-date schema, and the seed script upserts.
 */
export default async function globalSetup(): Promise<void> {
  const apiRoot = resolve(__dirname, "..");
  const envPath = resolve(apiRoot, ".env.test");
  const contents = readFileSync(envPath, "utf-8");

  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    env[trimmed.slice(0, equalsIndex).trim()] = trimmed.slice(equalsIndex + 1).trim();
  }

  execSync("npx prisma migrate deploy", { cwd: apiRoot, env, stdio: "inherit" });
  execSync("npx ts-node prisma/seed.ts", { cwd: apiRoot, env, stdio: "inherit" });
}
