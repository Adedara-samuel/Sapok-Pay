import { z } from "zod";

export const initiateTransferSchema = z.object({
  bankAccountId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  /** Test-only failure injection — never a real client's normal input. */
  simulateFailure: z.boolean().optional(),
});
export type InitiateTransferInput = z.infer<typeof initiateTransferSchema>;
