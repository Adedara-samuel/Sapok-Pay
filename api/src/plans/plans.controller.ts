import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { PlansService } from "./plans.service";

/** The public pricing catalog the landing page's Pricing section renders — editing the plans themselves lives on AdminController. */
@ApiTags("plans")
@Controller("plans")
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Public()
  @Get()
  list() {
    return this.plans.listPublic();
  }
}
