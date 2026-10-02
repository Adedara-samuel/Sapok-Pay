import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AdminOnlyGuard } from "../common/guards/admin-only.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ValidationApiException } from "../common/exceptions/api.exception";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { postAdjustmentSchema, type PostAdjustmentInput } from "../wallets/wallets.validation";
import { WalletsService } from "../wallets/wallets.service";
import { AdminService } from "./admin.service";
import type { AccessTokenPayload } from "../auth/jwt-payload";

@ApiTags("admin")
@UseGuards(AdminOnlyGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly wallets: WalletsService,
  ) {}

  @Get("merchants")
  listMerchants() {
    return this.admin.listMerchants();
  }

  @Get("merchants/:id")
  getMerchant(@Param("id") id: string) {
    return this.admin.getMerchant(id);
  }

  @Get("usage")
  getUsage() {
    return this.admin.getUsageSummary();
  }

  @Get("merchants/:id/transactions")
  listMerchantTransactions(@Param("id") id: string) {
    return this.wallets.listTransactions(id);
  }

  /**
   * Idempotency-Key is a REQUIRED header for this mutation — every
   * financial-mutation endpoint must be safely replayable, per the design
   * principles in README.md.
   */
  @Post("merchants/:id/wallet/adjustments")
  @HttpCode(HttpStatus.CREATED)
  postAdjustment(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(postAdjustmentSchema)) body: PostAdjustmentInput,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @CurrentUser() actor: AccessTokenPayload,
  ) {
    if (!idempotencyKey) {
      throw new ValidationApiException("The Idempotency-Key header is required for this endpoint");
    }
    return this.wallets.postAdjustment(id, body, idempotencyKey, actor.sub);
  }
}
