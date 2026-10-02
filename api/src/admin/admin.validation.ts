import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1),
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateSubscriptionSchema = z.object({
  planKey: z.enum(["free", "growth", "scale"]),
});
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export const transactionSeriesQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});
export type TransactionSeriesQuery = z.infer<typeof transactionSeriesQuerySchema>;
