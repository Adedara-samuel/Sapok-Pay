import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ContactService } from "./contact.service";
import { submitContactSchema, type SubmitContactInput } from "./contact.validation";

/** The public-write half — viewing submissions lives on AdminController, behind AdminOnlyGuard. */
@ApiTags("contact")
@Controller("contact")
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(@Body(new ZodValidationPipe(submitContactSchema)) body: SubmitContactInput) {
    return this.contact.submit(body);
  }
}
