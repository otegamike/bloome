import { z } from "zod";

import { dayString } from "@/lib/shared/schemas/common";

export const packCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
  activeDays: z.number().int().min(1).max(120),
  placeboDays: z.number().int().min(0).max(14),
  startDay: dayString,
});

export const packUpdateSchema = packCreateSchema.partial();

export type PackCreateInput = z.infer<typeof packCreateSchema>;
export type PackUpdateInput = z.infer<typeof packUpdateSchema>;
