import { z } from "zod";

import { timeString, timezoneString } from "@/lib/shared/schemas/common";

export const meUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name is too long").optional(),
  timezone: timezoneString.optional(),
  theme: z.enum(["blush", "rose", "peach"]).optional(),
  reminder: z
    .object({
      enabled: z.boolean(),
      time: timeString,
    })
    .optional(),
});

export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE"),
});

export type MeUpdateInput = z.infer<typeof meUpdateSchema>;
