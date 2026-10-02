import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PayrollBatchesController } from "./payroll-batches.controller";
import { PayrollBatchesService } from "./payroll-batches.service";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { PaymentsModule } from "../payments/payments.module";
import { WalletsModule } from "../wallets/wallets.module";
import { WebhooksModule } from "../webhooks/webhooks.module";

@Module({
  imports: [JwtModule.register({}), PaymentsModule, WalletsModule, WebhooksModule],
  controllers: [PayrollBatchesController],
  providers: [PayrollBatchesService, WalletAccessGuard],
})
export class PayrollBatchesModule {}
