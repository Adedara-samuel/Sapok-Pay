import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { WalletsController } from "./wallets.controller";
import { WalletsService } from "./wallets.service";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { WebhooksModule } from "../webhooks/webhooks.module";

@Module({
  // Registered with no default options — every call site (WalletAccessGuard)
  // passes its own `secret` explicitly, so there's nothing to configure here.
  imports: [JwtModule.register({}), WebhooksModule],
  controllers: [WalletsController],
  providers: [WalletsService, WalletAccessGuard],
  exports: [WalletsService],
})
export class WalletsModule {}
