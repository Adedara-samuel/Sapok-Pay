import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminOnlyGuard } from "../common/guards/admin-only.guard";
import { WalletsModule } from "../wallets/wallets.module";

@Module({
  imports: [WalletsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminOnlyGuard],
})
export class AdminModule {}
