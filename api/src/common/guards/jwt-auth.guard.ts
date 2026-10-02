import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { UnauthorizedApiException } from "../exceptions/api.exception";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AccessTokenPayload } from "../../auth/jwt-payload";

/**
 * Applied globally (APP_GUARD) — every route requires a valid access token
 * (merchant OR admin scope) unless explicitly marked @Public(). No Passport
 * dependency: this service is small enough that verifying the JWT directly
 * via JwtService is simpler than wiring up a strategy for one token type.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request.headers.authorization);
    if (!token) throw new UnauthorizedApiException();

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedApiException("Invalid or expired access token", "INVALID_ACCESS_TOKEN");
    }
  }

  private extractToken(header: string | undefined): string | null {
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice("Bearer ".length);
  }
}
