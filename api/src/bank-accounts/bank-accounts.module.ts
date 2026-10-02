import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { BankAccountsController } from "./bank-accounts.controller";
import { BankAccountsService } from "./bank-accounts.service";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [JwtModule.register({}), PaymentsModule],
  controllers: [BankAccountsController],
  providers: [BankAccountsService, WalletAccessGuard],
  exports: [BankAccountsService],
})
export class BankAccountsModule {}
