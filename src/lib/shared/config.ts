import type { PackPreset, ThemeName } from "@/types";

export const APP_NAME = "Bloome";

export const APP_DESCRIPTION =
  "A soft, simple tracker for your daily birth-control pills.";

export const THEMES: ThemeName[] = ["blush", "rose", "peach"];

export const DEFAULT_THEME: ThemeName = "blush";

export const DEFAULT_PRESETS: PackPreset[] = [
  { id: "levofem", name: "Levofem", activeDays: 21, placeboDays: 7 },
  { id: "generic-28", name: "Generic 28-day", activeDays: 21, placeboDays: 7 },
  { id: "24-plus-4", name: "24 + 4", activeDays: 24, placeboDays: 4 },
  { id: "continuous", name: "Continuous", activeDays: 28, placeboDays: 0 },
];
