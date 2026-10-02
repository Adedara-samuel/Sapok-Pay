import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TransfersController } from "./transfers.controller";
import { TransfersService } from "./transfers.service";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { PaymentsModule } from "../payments/payments.module";
import { BankAccountsModule } from "../bank-accounts/bank-accounts.module";
import { WalletsModule } from "../wallets/wallets.module";

@Module({
  imports: [JwtModule.register({}), PaymentsModule, BankAccountsModule, WalletsModule],
  controllers: [TransfersController],
  providers: [TransfersService, WalletAccessGuard],
})
export class TransfersModule {}
