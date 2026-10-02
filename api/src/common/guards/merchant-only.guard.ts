import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ForbiddenApiException } from "../exceptions/api.exception";
import type { AccessTokenPayload } from "../../auth/jwt-payload";

/** Runs after the global JwtAuthGuard. Rejects AdminUser tokens. */
@Injectable()
export class MerchantOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AccessTokenPayload | undefined;
    if (user?.scope !== "merchant") {
      throw new ForbiddenApiException("This endpoint is restricted to merchant accounts", "MERCHANT_ONLY");
    }
    return true;
  }
}
