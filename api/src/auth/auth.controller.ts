import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { loginSchema, merchantSignupSchema, type LoginInput, type MerchantSignupInput } from "./auth.validation";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("merchant/signup")
  @HttpCode(HttpStatus.CREATED)
  merchantSignup(@Body(new ZodValidationPipe(merchantSignupSchema)) body: MerchantSignupInput) {
    return this.authService.merchantSignup(body.email, body.password, body.businessName);
  }

  // One login for every user — merchant or platform admin — so the web app
  // only ever needs a single sign-in form. See AuthService.login's own
  // comment for why it's timing-safe across both tables. The older
  // merchant/login and admin/login routes below are unchanged (existing
  // e2e tests and any other caller already depend on them) — this is an
  // addition, not a replacement.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("merchant/login")
  @HttpCode(HttpStatus.OK)
  merchantLogin(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.authService.merchantLogin(body.email, body.password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.authService.adminLogin(body.email, body.password);
  }
}
