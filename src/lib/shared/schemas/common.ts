import { z } from "zod";

import { isValidDay, isValidMonth, isValidTimezone } from "@/lib/shared/dates";

export const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .refine(isValidDay, "Must be a real calendar date");

export const monthString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Must be YYYY-MM")
  .refine(isValidMonth, "Must be a real calendar month");

export const timezoneString = z
  .string()
  .min(1, "Timezone is required")
  .refine(isValidTimezone, "Must be a valid IANA timezone");

export const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm (24-hour)");

export const emailString = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Must be a valid email address")
  .max(254, "Email is too long");
