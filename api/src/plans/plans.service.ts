import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic() {
    const plans = await this.prisma.subscriptionPlan.findMany({ orderBy: { priceMinor: "asc" } });
    return plans.map((plan) => ({
      key: plan.key,
      name: plan.name,
      priceMinor: plan.priceMinor,
      billingInterval: plan.billingInterval,
      transactionFeeBps: plan.transactionFeeBps,
    }));
  }
}
