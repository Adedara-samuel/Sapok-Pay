import { Module } from "@nestjs/common";
import { ServiceAccountsController } from "./service-accounts.controller";
import { ServiceAccountsService } from "./service-accounts.service";
import { ServiceAuthGuard } from "../common/guards/service-auth.guard";

@Module({
  controllers: [ServiceAccountsController],
  providers: [ServiceAccountsService, ServiceAuthGuard],
})
export class ServiceAccountsModule {}
