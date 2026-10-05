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

export const rangeQuerySchema = z
  .object({
    from: z.string(),
    to: z.string(),
  })
  .refine((v) => v.from.length > 0 && v.to.length > 0, "from and to are required");
