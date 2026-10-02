import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundApiException } from "../common/exceptions/api.exception";
import { generateApiKey, hashApiKey } from "../common/utils/api-key";

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, name: string): Promise<{ id: string; name: string; prefix: string; rawKey: string; createdAt: string }> {
    const { raw, prefix } = generateApiKey();
    const apiKey = await this.prisma.apiKey.create({
      data: { merchantId, name, prefix, keyHash: hashApiKey(raw) },
    });
    // The only time the raw key is ever available — the caller must save it now.
    return { id: apiKey.id, name: apiKey.name, prefix: apiKey.prefix, rawKey: raw, createdAt: apiKey.createdAt.toISOString() };
  }

  async list(merchantId: string) {
    const keys = await this.prisma.apiKey.findMany({ where: { merchantId }, orderBy: { createdAt: "desc" } });
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      status: key.status,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
      revokedAt: key.revokedAt?.toISOString() ?? null,
    }));
  }

  async revoke(merchantId: string, id: string): Promise<{ revoked: true }> {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey || apiKey.merchantId !== merchantId) {
      throw new NotFoundApiException("API key not found", "API_KEY_NOT_FOUND");
    }
    await this.prisma.apiKey.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date() } });
    return { revoked: true };
  }
}
