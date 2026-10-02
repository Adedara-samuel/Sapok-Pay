import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { generateApiKey, hashApiKey } from "../common/utils/api-key";
import type { ProvisionMerchantInput } from "./service-accounts.validation";

@Injectable()
export class ServiceAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent by `externalReference`: calling this twice for the same
   * caller-side tenant (e.g. the same Sapok OneGrid Organisation) returns the
   * SAME merchant rather than creating a duplicate. The raw API key can
   * only ever be shown once (Phase 3's rule, same as every other API key
   * in this system) — a repeat call returns `apiKey: null` and
   * `alreadyProvisioned: true` so the caller knows not to expect a fresh
   * credential and must already be holding the one from the first call.
   */
  async provisionMerchant(input: ProvisionMerchantInput) {
    const existing = await this.prisma.merchant.findUnique({ where: { externalReference: input.externalReference } });
    if (existing) {
      return { merchantId: existing.id, apiKey: null, alreadyProvisioned: true };
    }

    // No human ever logs into a service-provisioned merchant with a
    // password — generate one, hash it, and discard the plaintext. Only
    // API-key auth is expected to be used against this merchant going forward.
    const discardedPassword = randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(discardedPassword, 12);
    const { raw: rawApiKey, prefix } = generateApiKey();

    const merchant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.merchant.create({
        data: { email: input.email, passwordHash, businessName: input.businessName, externalReference: input.externalReference },
      });
      const wallet = await tx.wallet.create({ data: { merchantId: created.id, currency: "NGN" } });
      await tx.ledgerAccount.create({ data: { walletId: wallet.id, currency: "NGN" } });
      await tx.apiKey.create({ data: { merchantId: created.id, name: "Service-provisioned key", prefix, keyHash: hashApiKey(rawApiKey) } });
      return created;
    });

    return { merchantId: merchant.id, apiKey: rawApiKey, alreadyProvisioned: false };
  }
}
