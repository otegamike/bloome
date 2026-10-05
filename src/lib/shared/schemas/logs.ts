import { z } from "zod";

export const logUpsertSchema = z.object({
  status: z.enum(["taken", "skipped"]),
  note: z.string().trim().max(200, "Note is too long").optional(),
});

export type LogUpsertInput = z.infer<typeof logUpsertSchema>;
