import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Runs in every test worker before the test framework installs — no
 * `dotenv` dependency needed for a format this simple. Loads .env.test,
 * NEVER the real .env.
 */
function loadEnvFile(path: string): void {
  const contents = readFileSync(path, "utf-8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    process.env[key] = value;
  }
}

loadEnvFile(resolve(__dirname, "../.env.test"));
