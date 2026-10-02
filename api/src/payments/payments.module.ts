import { Module } from "@nestjs/common";
import { PAYMENT_PROVIDER } from "./payment-provider.interface";
import { MockBankProviderService } from "./mock-bank-provider.service";

@Module({
  providers: [MockBankProviderService, { provide: PAYMENT_PROVIDER, useClass: MockBankProviderService }],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
