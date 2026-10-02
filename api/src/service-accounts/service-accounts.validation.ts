import { z } from "zod";

export const provisionMerchantSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  businessName: z.string().trim().min(1),
  /** The caller's own tenant ID (e.g. a Sapok OneGrid Organisation.id) — makes provisioning idempotent. */
  externalReference: z.string().trim().min(1),
});
export type ProvisionMerchantInput = z.infer<typeof provisionMerchantSchema>;
