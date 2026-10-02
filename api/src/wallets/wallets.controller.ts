import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { WalletsService } from "./wallets.service";

interface RequestWithMerchant extends Request {
  merchantId: string;
}

@ApiTags("wallets")
@Controller("wallets")
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  /**
   * @Public() bypasses the global JwtAuthGuard (which only understands JWTs)
   * — WalletAccessGuard does its own auth, accepting either a merchant JWT
   * or an API key, which is exactly the point of this endpoint.
   */
  @Public()
  @UseGuards(WalletAccessGuard)
  @Get("me")
  getMine(@Req() request: RequestWithMerchant) {
    return this.wallets.getByMerchantId(request.merchantId);
  }

  @Public()
  @UseGuards(WalletAccessGuard)
  @Get("me/transactions")
  listMyTransactions(@Req() request: RequestWithMerchant) {
    return this.wallets.listTransactions(request.merchantId);
  }
}
