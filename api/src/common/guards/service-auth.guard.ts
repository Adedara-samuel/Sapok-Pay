import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import { UnauthorizedApiException } from "../exceptions/api.exception";

/**
 * Gates system-to-system endpoints (currently just /service/merchants) —
 * no human ever calls these, so a shared secret header is the right tool,
 * not a JWT scope. Never reachable via the global JwtAuthGuard's merchant/
 * admin scopes; this is a third, separate trust boundary.
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided: string | undefined = request.headers["x-service-secret"];
    const expected = this.config.getOrThrow<string>("SERVICE_AUTH_SECRET");

    if (!provided || !this.timingSafeCompare(provided, expected)) {
      throw new UnauthorizedApiException("Invalid service secret", "INVALID_SERVICE_SECRET");
    }
    return true;
  }

  private timingSafeCompare(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    // Lengths differ → definitely not equal, but still compare against a
    // same-length dummy buffer first so this branch doesn't short-circuit
    // in less time than the equal-length case (same reasoning as the
    // login timing-safe-dummy-hash pattern elsewhere in this codebase).
    if (bufferA.length !== bufferB.length) {
      timingSafeEqual(bufferA, bufferA);
      return false;
    }
    return timingSafeEqual(bufferA, bufferB);
  }
}
