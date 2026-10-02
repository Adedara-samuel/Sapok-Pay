import { z } from "zod";

export const postAdjustmentSchema = z.object({
  amountMinor: z.number().int().positive(),
  direction: z.enum(["CREDIT", "DEBIT"]),
  description: z.string().trim().min(1),
});
export type PostAdjustmentInput = z.infer<typeof postAdjustmentSchema>;
