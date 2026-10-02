import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminOnlyGuard } from "../common/guards/admin-only.guard";
import { WalletsModule } from "../wallets/wallets.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { ContactModule } from "../contact/contact.module";

@Module({
  imports: [WalletsModule, SiteSettingsModule, ContactModule],
  controllers: [AdminController],
  providers: [AdminService, AdminOnlyGuard],
})
export class AdminModule {}
