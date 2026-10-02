import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "sapok_live_";

/**
 * SHA-256, not bcrypt: API keys are already high-entropy random secrets
 * (unlike passwords, which are low-entropy and need slow hashing to resist
 * brute force), so a fast, indexable hash lets a lookup be
 * `WHERE keyHash = sha256(provided)` instead of loading every active key
 * and bcrypt-comparing each one.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Returns { raw, prefix } — `raw` is shown to the merchant exactly once. */
export function generateApiKey(): { raw: string; prefix: string } {
  const secret = randomBytes(24).toString("base64url");
  const raw = `${KEY_PREFIX}${secret}`;
  // First 12 chars after the prefix — enough to tell keys apart in a list,
  // not enough to reconstruct the key.
  const prefix = `${KEY_PREFIX}${secret.slice(0, 8)}`;
  return { raw, prefix };
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX);
}
