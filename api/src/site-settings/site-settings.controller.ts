import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { SiteSettingsService } from "./site-settings.service";

/** The public-read half — the landing page's only way to fetch its own editable copy. Editing lives on AdminController, behind AdminOnlyGuard. */
@ApiTags("site-settings")
@Controller("site-settings")
export class SiteSettingsController {
  constructor(private readonly siteSettings: SiteSettingsService) {}

  @Public()
  @Get()
  getPublicSettings() {
    return this.siteSettings.getPublicSettings();
  }
}
