import { z } from "zod";

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

export const monthsParamSchema = z
  .string()
  .transform((raw) =>
    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  )
  .pipe(z.array(monthParamSchema).min(1, "At least one month is required").max(CALENDAR_MONTHS_LIMIT))
  .transform((months) => Array.from(new Set(months)));

export const rangeQuerySchema = z
  .object({
    from: z.string(),
    to: z.string(),
  })
  .refine((v) => v.from.length > 0 && v.to.length > 0, "from and to are required");
