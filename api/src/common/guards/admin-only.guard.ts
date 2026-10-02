import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ForbiddenApiException } from "../exceptions/api.exception";
import type { AccessTokenPayload } from "../../auth/jwt-payload";

/**
 * Runs after the global JwtAuthGuard, so request.user is already populated.
 * Rejects anything that isn't an AdminUser token — a Merchant token, however
 * valid, never passes this.
 */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AccessTokenPayload | undefined;
    if (user?.scope !== "admin") {
      throw new ForbiddenApiException("This endpoint is restricted to platform administrators", "ADMIN_ONLY");
    }
    return true;
  }
}
