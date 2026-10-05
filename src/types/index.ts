// Shared TypeScript types for Bloome. Types only — no logic here.
// "Missed" is never stored; it is derived on the fly from kind + log + today.

export type DayString = string; // "YYYY-MM-DD" in the user's own timezone

export type ThemeName = "blush" | "rose" | "peach";

export type LogStatus = "taken" | "skipped"; // "missed" is derived, never stored

export type DayKind = "active" | "placebo" | "outside"; // derived from pack cycle

export type DayState =
  | "taken"
  | "missed"
  | "upcoming"
  | "today"
  | "placebo"
  | "skipped"
  | "outside";

export interface PackPreset {
  id: string;
  name: string;
  activeDays: number;
  placeboDays: number;
}

// Auth.js v5 module augmentation: expose the Mongo user id on session + JWT.
declare module "next-auth" {
  interface Session {
    userId?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}
