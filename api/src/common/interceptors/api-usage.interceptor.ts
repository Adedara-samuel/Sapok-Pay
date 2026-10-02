import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap, catchError, throwError } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Records one ApiUsageEvent per API-key-authenticated request, with the
 * REAL response status code — runs after the handler, unlike the guard
 * (which only knows auth succeeded, not what the request actually did).
 * No-ops for JWT-authenticated (dashboard) requests — request.apiKeyId is
 * only ever set by WalletAccessGuard's API-key branch.
 */
@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (!request.apiKeyId) return next.handle();

    const record = (statusCode: number) => {
      void this.prisma.apiUsageEvent
        .create({
          data: {
            merchantId: request.merchantId,
            apiKeyId: request.apiKeyId,
            method: request.method,
            path: request.originalUrl ?? request.url,
            statusCode,
          },
        })
        .catch(() => undefined);
    };

    return next.handle().pipe(
      tap(() => record(response.statusCode)),
      catchError((error) => {
        record(error?.status ?? 500);
        return throwError(() => error);
      }),
    );
  }
}
