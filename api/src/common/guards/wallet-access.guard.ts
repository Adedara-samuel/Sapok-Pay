import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { UnauthorizedApiException } from "../exceptions/api.exception";
import { hashApiKey, looksLikeApiKey } from "../utils/api-key";
import type { AccessTokenPayload } from "../../auth/jwt-payload";

/**
 * Accepts EITHER a merchant JWT (dashboard session) OR an API key (the
 * merchant's own application calling programmatically) — the two auth
 * modes this service supports, see docs in the Merchant/ApiKey schema
 * comments. Populates `request.merchantId` either way so downstream
 * controllers don't need to care which auth mode was used.
 */
@Injectable()
export class WalletAccessGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedApiException();
    const token = header.slice("Bearer ".length);

    if (looksLikeApiKey(token)) {
      return this.authenticateApiKey(token, request);
    }
    return this.authenticateJwt(token, request);
  }

  private async authenticateJwt(token: string, request: any): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
      if (payload.scope !== "merchant") throw new Error("not a merchant token");
      request.merchantId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedApiException("Invalid or expired access token", "INVALID_ACCESS_TOKEN");
    }
  }

  private async authenticateApiKey(rawKey: string, request: any): Promise<boolean> {
    const keyHash = hashApiKey(rawKey);
    const apiKey = await this.prisma.apiKey.findUnique({ where: { keyHash } });
    if (!apiKey || apiKey.status !== "ACTIVE") {
      throw new UnauthorizedApiException("Invalid or revoked API key", "INVALID_API_KEY");
    }

    request.merchantId = apiKey.merchantId;
    request.apiKeyId = apiKey.id;

    // Fire-and-forget — never block the actual request on it. The real
    // usage-event row (with the actual response status code) is recorded by
    // ApiUsageInterceptor after the handler runs, not here — a guard runs
    // before the handler, so it can't know the real outcome yet.
    void this.prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);

    return true;
  }
}
