import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AdminOnlyGuard } from "../common/guards/admin-only.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ValidationApiException } from "../common/exceptions/api.exception";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { postAdjustmentSchema, type PostAdjustmentInput } from "../wallets/wallets.validation";
import { WalletsService } from "../wallets/wallets.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import { ContactService } from "../contact/contact.service";
import { AdminService } from "./admin.service";
import {
  createUserSchema,
  transactionSeriesQuerySchema,
  updatePlanSchema,
  updateSiteSettingsSchema,
  updateSubscriptionSchema,
  type CreateUserInput,
  type TransactionSeriesQuery,
  type UpdatePlanInput,
  type UpdateSiteSettingsInput,
  type UpdateSubscriptionInput,
} from "./admin.validation";
import type { AccessTokenPayload } from "../auth/jwt-payload";

@ApiTags("admin")
@UseGuards(AdminOnlyGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly wallets: WalletsService,
    private readonly siteSettings: SiteSettingsService,
    private readonly contact: ContactService,
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

  // ---- Dashboard --------------------------------------------------------

  @Get("dashboard/summary")
  getDashboardSummary() {
    return this.admin.getDashboardSummary();
  }

  @Get("dashboard/transactions-series")
  getTransactionSeries(@Query(new ZodValidationPipe(transactionSeriesQuerySchema)) query: TransactionSeriesQuery) {
    return this.admin.getTransactionSeries(query.range);
  }

  @Get("dashboard/activity")
  getRecentActivity() {
    return this.admin.getRecentActivity();
  }

  // ---- Organizations & Users ---------------------------------------------

  @Get("organizations")
  listOrganizations() {
    return this.admin.listOrganizations();
  }

  @Get("users")
  listUsers() {
    return this.admin.listUsers();
  }

  @Post("organizations/:id/users")
  @HttpCode(HttpStatus.CREATED)
  createUser(@Param("id") id: string, @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.admin.createUser(id, body);
  }

  // ---- Subscriptions ------------------------------------------------------

  @Get("subscription-plans")
  listSubscriptionPlans() {
    return this.admin.listSubscriptionPlans();
  }

  @Patch("subscription-plans/:id")
  updatePlanPricing(@Param("id") id: string, @Body(new ZodValidationPipe(updatePlanSchema)) body: UpdatePlanInput) {
    return this.admin.updatePlanPricing(id, body);
  }

  @Get("subscriptions")
  listSubscriptions() {
    return this.admin.listSubscriptions();
  }

  @Patch("organizations/:id/subscription")
  updateMerchantSubscription(@Param("id") id: string, @Body(new ZodValidationPipe(updateSubscriptionSchema)) body: UpdateSubscriptionInput) {
    return this.admin.updateMerchantSubscription(id, body.planKey);
  }

  // ---- Platform-wide transactions & payouts --------------------------------

  @Get("transactions")
  listTransactionsPlatformWide() {
    return this.admin.listTransactionsPlatformWide();
  }

  @Get("payouts")
  listPayoutsPlatformWide() {
    return this.admin.listPayoutsPlatformWide();
  }

  // ---- Contact submissions (from the public Contact Sales form) ------------

  @Get("contact-submissions")
  listContactSubmissions() {
    return this.contact.listForAdmin();
  }

  // ---- Site settings (editable landing-page content) -----------------------

  @Get("site-settings")
  listSiteSettings() {
    return this.siteSettings.listForAdmin();
  }

  @Patch("site-settings")
  updateSiteSettings(@Body(new ZodValidationPipe(updateSiteSettingsSchema)) body: UpdateSiteSettingsInput, @CurrentUser() actor: AccessTokenPayload) {
    return this.siteSettings.updateSettings(body, actor.sub);
  }
}
