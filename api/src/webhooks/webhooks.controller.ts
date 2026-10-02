import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { WalletAccessGuard } from "../common/guards/wallet-access.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { setWebhookEndpointSchema, type SetWebhookEndpointInput } from "./webhooks.validation";
import { WebhooksService } from "./webhooks.service";

interface RequestWithMerchant extends Request {
  merchantId: string;
}

@ApiTags("webhooks")
@Public()
@UseGuards(WalletAccessGuard)
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get("endpoint")
  getEndpoint(@Req() request: RequestWithMerchant) {
    return this.webhooks.getEndpoint(request.merchantId);
  }

  @Put("endpoint")
  setEndpoint(@Req() request: RequestWithMerchant, @Body(new ZodValidationPipe(setWebhookEndpointSchema)) body: SetWebhookEndpointInput) {
    return this.webhooks.setEndpoint(request.merchantId, body);
  }

  @Post("endpoint/rotate-secret")
  rotateSecret(@Req() request: RequestWithMerchant) {
    return this.webhooks.rotateSecret(request.merchantId);
  }

  @Get("events")
  listEvents(@Req() request: RequestWithMerchant) {
    return this.webhooks.listEvents(request.merchantId);
  }

  @Post("events/:id/redeliver")
  redeliver(@Req() request: RequestWithMerchant, @Param("id") id: string) {
    return this.webhooks.redeliver(request.merchantId, id);
  }
}
