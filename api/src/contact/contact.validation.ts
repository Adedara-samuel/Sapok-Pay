import { z } from "zod";

export const submitContactSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  workEmail: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(1).optional(),
  companyName: z.string().trim().min(1),
  companyWebsite: z.string().trim().min(1).optional(),
  companySize: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]),
  primaryProduct: z.string().trim().min(1),
  country: z.string().trim().min(1),
  monthlyPaymentVolume: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1),
  wantsUpdates: z.boolean().default(false),
});
export type SubmitContactInput = z.infer<typeof submitContactSchema>;
