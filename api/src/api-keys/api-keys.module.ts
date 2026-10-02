import { Module } from "@nestjs/common";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { MerchantOnlyGuard } from "../common/guards/merchant-only.guard";

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, MerchantOnlyGuard],
})
export class ApiKeysModule {}
