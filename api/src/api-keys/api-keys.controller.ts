import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MerchantOnlyGuard } from "../common/guards/merchant-only.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AccessTokenPayload } from "../auth/jwt-payload";
import { ApiKeysService } from "./api-keys.service";
import { createApiKeySchema, type CreateApiKeyInput } from "./api-keys.validation";

@ApiTags("api-keys")
@UseGuards(MerchantOnlyGuard)
@Controller("api-keys")
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload) {
    return this.apiKeys.list(actor.sub);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyInput, @CurrentUser() actor: AccessTokenPayload) {
    return this.apiKeys.create(actor.sub, body.name);
  }

  @Delete(":id")
  revoke(@Param("id") id: string, @CurrentUser() actor: AccessTokenPayload) {
    return this.apiKeys.revoke(actor.sub, id);
  }
}
