import { z } from "zod";

import { dayString } from "@/lib/shared/schemas/common";

export const periodStartSchema = z.object({
  day: dayString,
});

export type PeriodStartInput = z.infer<typeof periodStartSchema>;
