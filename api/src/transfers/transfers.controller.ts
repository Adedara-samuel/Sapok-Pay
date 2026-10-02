import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { ValidationApiException } from "../common/exceptions/api.exception";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { initiateTransferSchema, type InitiateTransferInput } from "./transfers.validation";
import { TransfersService } from "./transfers.service";

interface RequestWithMerchant extends Request {
  merchantId: string;
}

@ApiTags("transfers")
@Public()
@UseGuards(WalletAccessGuard)
@Controller("wallets/me")
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  /** Idempotency-Key is a REQUIRED header — every financial-mutation endpoint must be safely replayable. */
  @Post("deposits")
  @HttpCode(HttpStatus.CREATED)
  deposit(
    @Req() request: RequestWithMerchant,
    @Body(new ZodValidationPipe(initiateTransferSchema)) body: InitiateTransferInput,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey) throw new ValidationApiException("The Idempotency-Key header is required for this endpoint");
    return this.transfers.deposit(request.merchantId, body, idempotencyKey);
  }

  @Post("withdrawals")
  @HttpCode(HttpStatus.CREATED)
  withdraw(
    @Req() request: RequestWithMerchant,
    @Body(new ZodValidationPipe(initiateTransferSchema)) body: InitiateTransferInput,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey) throw new ValidationApiException("The Idempotency-Key header is required for this endpoint");
    return this.transfers.withdraw(request.merchantId, body, idempotencyKey);
  }
}
