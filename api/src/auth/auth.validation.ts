import { z } from "zod";

export const merchantSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  businessName: z.string().trim().min(1),
});
export type MerchantSignupInput = z.infer<typeof merchantSignupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;
