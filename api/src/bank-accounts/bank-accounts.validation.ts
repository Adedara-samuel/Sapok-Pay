import { z } from "zod";

export const linkBankAccountSchema = z.object({
  accountNumber: z.string().trim().regex(/^\d{10}$/, "accountNumber must be exactly 10 digits"),
  bankCode: z.string().trim().min(1).default("MOCK001"),
});
export type LinkBankAccountInput = z.infer<typeof linkBankAccountSchema>;
