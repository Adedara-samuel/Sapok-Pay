import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { ValidationApiException } from "../common/exceptions/api.exception";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { createPayrollBatchSchema, type CreatePayrollBatchInput } from "./payroll-batches.validation";
import { PayrollBatchesService } from "./payroll-batches.service";

interface RequestWithMerchant extends Request {
  merchantId: string;
}

@ApiTags("payroll-batches")
@Public()
@UseGuards(WalletAccessGuard)
@Controller("wallets/me/payroll-batches")
export class PayrollBatchesController {
  constructor(private readonly payrollBatches: PayrollBatchesService) {}

  @Get()
  list(@Req() request: RequestWithMerchant) {
    return this.payrollBatches.list(request.merchantId);
  }

  @Get(":id")
  findById(@Req() request: RequestWithMerchant, @Param("id") id: string) {
    return this.payrollBatches.findById(request.merchantId, id);
  }

  /** Idempotency-Key is a REQUIRED header — every financial-mutation endpoint must be safely replayable. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() request: RequestWithMerchant,
    @Body(new ZodValidationPipe(createPayrollBatchSchema)) body: CreatePayrollBatchInput,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey) throw new ValidationApiException("The Idempotency-Key header is required for this endpoint");
    return this.payrollBatches.create(request.merchantId, body, idempotencyKey);
  }
}
