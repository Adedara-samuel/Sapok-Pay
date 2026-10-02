import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { linkBankAccountSchema, type LinkBankAccountInput } from "./bank-accounts.validation";
import { BankAccountsService } from "./bank-accounts.service";

interface RequestWithMerchant extends Request {
  merchantId: string;
}

@ApiTags("bank-accounts")
@Public()
@UseGuards(WalletAccessGuard)
@Controller("wallets/bank-accounts")
export class BankAccountsController {
  constructor(private readonly bankAccounts: BankAccountsService) {}

  @Get()
  list(@Req() request: RequestWithMerchant) {
    return this.bankAccounts.list(request.merchantId);
  }

  @Post()
  link(@Req() request: RequestWithMerchant, @Body(new ZodValidationPipe(linkBankAccountSchema)) body: LinkBankAccountInput) {
    return this.bankAccounts.link(request.merchantId, body);
  }
}
