import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { WalletsModule } from "./wallets/wallets.module";
import { AdminModule } from "./admin/admin.module";
import { PaymentsModule } from "./payments/payments.module";
import { BankAccountsModule } from "./bank-accounts/bank-accounts.module";
import { TransfersModule } from "./transfers/transfers.module";
import { PayrollBatchesModule } from "./payroll-batches/payroll-batches.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { ServiceAccountsModule } from "./service-accounts/service-accounts.module";
import { SiteSettingsModule } from "./site-settings/site-settings.module";
import { PlansModule } from "./plans/plans.module";
import { ContactModule } from "./contact/contact.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { ApiUsageInterceptor } from "./common/interceptors/api-usage.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    ApiKeysModule,
    WalletsModule,
    AdminModule,
    PaymentsModule,
    BankAccountsModule,
    TransfersModule,
    PayrollBatchesModule,
    WebhooksModule,
    ServiceAccountsModule,
    SiteSettingsModule,
    PlansModule,
    ContactModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiUsageInterceptor },
  ],
})
export class AppModule {}
