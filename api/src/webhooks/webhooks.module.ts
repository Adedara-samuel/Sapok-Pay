import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";

@Module({
  imports: [JwtModule.register({})],
  controllers: [WebhooksController],
  providers: [WebhooksService, WalletAccessGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
