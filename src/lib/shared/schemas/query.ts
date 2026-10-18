import { z } from "zod";

import { monthsInRange } from "@/lib/shared/dates";

export const monthParamSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Must be YYYY-MM")
  .refine((m) => {
    const now = new Date();
    const thisMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
    const [y, mon] = m.split("-").map(Number) as [number, number];
    const target = y * 12 + (mon - 1);
    return Math.abs(target - thisMonth) <= 60;
  }, "Month must be within 5 years of today");

/** Upper bound on a batched calendar request, so one call stays cheap. */
export const CALENDAR_MONTHS_LIMIT = 12;

/**
 * Calendar query: either a single `month`, or a `from`/`to` month range
 * (inclusive). The range is capped at CALENDAR_MONTHS_LIMIT months.
 */
export const calendarQuerySchema = z
  .object({
    month: monthParamSchema.optional(),
    from: monthParamSchema.optional(),
    to: monthParamSchema.optional(),
  })
  .refine(
    (v) => (v.month ? !v.from && !v.to : !!v.from && !!v.to),
    "Provide month, or both from and to",
  )
  .refine((v) => !v.from || !v.to || v.from <= v.to, "from must not be after to")
  .refine(
    (v) => !v.from || !v.to || monthsInRange(v.from, v.to).length <= CALENDAR_MONTHS_LIMIT,
    `Range must be ${CALENDAR_MONTHS_LIMIT} months or fewer`,
  );

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

export const rangeQuerySchema = z
  .object({
    from: z.string(),
    to: z.string(),
  })
  .refine((v) => v.from.length > 0 && v.to.length > 0, "from and to are required");
