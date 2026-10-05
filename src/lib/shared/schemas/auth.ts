import { z } from "zod";

import { emailString, timezoneString } from "@/lib/shared/schemas/common";

// bcrypt ignores everything past 72 bytes, so the cap is measured in bytes.
function byteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export const passwordString = z
  .string()
  .refine((s) => byteLength(s) >= 8, "Password must be at least 8 characters")
  .refine((s) => byteLength(s) <= 72, "Password must be at most 72 characters");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
  email: emailString,
  password: passwordString,
  timezone: timezoneString,
});

export const credentialsLoginSchema = z.object({
  email: emailString,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CredentialsLoginInput = z.infer<typeof credentialsLoginSchema>;
