import { z } from "zod";

import { timezoneString } from "@/lib/shared/schemas/common";

export const shortcutTokenLabel = z
  .string()
  .trim()
  .min(1, "Give this token a name")
  .max(40, "Keep the name under 40 characters");

/** Token lifetime in days; null means the token never expires. */
export const shortcutTokenExpiry = z.union([
  z.literal(30),
  z.literal(90),
  z.literal(365),
  z.null(),
]);

export const createShortcutTokenSchema = z.object({
  label: shortcutTokenLabel,
  expiresInDays: shortcutTokenExpiry,
});

export type CreateShortcutTokenInput = z.infer<typeof createShortcutTokenSchema>;

/** `GET /api/shortcuts/status` query: optional IANA timezone for "today". */
export const shortcutStatusQuerySchema = z.object({
  tz: timezoneString.optional(),
});
