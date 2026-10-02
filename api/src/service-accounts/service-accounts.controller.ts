import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { ServiceAuthGuard } from "../common/guards/service-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { provisionMerchantSchema, type ProvisionMerchantInput } from "./service-accounts.validation";
import { ServiceAccountsService } from "./service-accounts.service";

@ApiTags("service-accounts")
@Public()
@UseGuards(ServiceAuthGuard)
@Controller("service")
export class ServiceAccountsController {
  constructor(private readonly serviceAccounts: ServiceAccountsService) {}

  @Post("merchants")
  @HttpCode(HttpStatus.CREATED)
  provisionMerchant(@Body(new ZodValidationPipe(provisionMerchantSchema)) body: ProvisionMerchantInput) {
    return this.serviceAccounts.provisionMerchant(body);
  }
}
