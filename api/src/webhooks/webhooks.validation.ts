import { z } from "zod";

export const setWebhookEndpointSchema = z.object({
  url: z.string().trim().url(),
});
export type SetWebhookEndpointInput = z.infer<typeof setWebhookEndpointSchema>;
