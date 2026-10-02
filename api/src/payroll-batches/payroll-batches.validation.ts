import { z } from "zod";

const payrollBatchItemSchema = z.object({
  // Deliberately loose here (unlike bank-accounts.validation's strict
  // 10-digit check) — a malformed account number is exactly the kind of
  // per-item failure this endpoint exists to isolate. PaymentProvider.
  // verifyAccount does the real format validation, per item, so one typo'd
  // row in a 500-row batch fails only that row instead of rejecting the
  // whole submission before anyone gets paid.
  recipientAccountNumber: z.string().trim().min(1).max(32),
  amountMinor: z.number().int().positive(),
  recipientLabel: z.string().trim().min(1).optional(),
  /** Test-only failure injection for this specific item — never a real client's normal input. */
  simulateFailure: z.boolean().optional(),
});

export const createPayrollBatchSchema = z.object({
  items: z.array(payrollBatchItemSchema).min(1).max(500),
});
export type CreatePayrollBatchInput = z.infer<typeof createPayrollBatchSchema>;
