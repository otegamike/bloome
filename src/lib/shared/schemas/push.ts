import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Subscription endpoint must be a URL"),
  keys: z.object({
    p256dh: z.string().min(1, "Missing subscription key"),
    auth: z.string().min(1, "Missing subscription key"),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url("Subscription endpoint must be a URL"),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
