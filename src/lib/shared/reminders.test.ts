import { describe, expect, it } from "vitest";

import { resolveOnPlaceboDays, shouldRemindToday } from "@/lib/shared/reminders";

describe("shouldRemindToday", () => {
  it("reminds on an unlogged active day regardless of the setting", () => {
    expect(shouldRemindToday({ kind: "active", hasLog: false, onPlaceboDays: true })).toBe(true);
    expect(shouldRemindToday({ kind: "active", hasLog: false, onPlaceboDays: false })).toBe(true);
  });

  it("stays quiet on a logged active day regardless of the setting", () => {
    expect(shouldRemindToday({ kind: "active", hasLog: true, onPlaceboDays: true })).toBe(false);
    expect(shouldRemindToday({ kind: "active", hasLog: true, onPlaceboDays: false })).toBe(false);
  });

  it("follows the setting on placebo days", () => {
    expect(shouldRemindToday({ kind: "placebo", hasLog: false, onPlaceboDays: true })).toBe(true);
    expect(
      shouldRemindToday({
        kind: "placebo",
        hasLog: false,
        onPlaceboDays: false,
      })
    ).toBe(false);
  });

  it("never reminds outside any pack", () => {
    expect(shouldRemindToday({ kind: "outside", hasLog: false, onPlaceboDays: true })).toBe(false);
    expect(
      shouldRemindToday({
        kind: "outside",
        hasLog: false,
        onPlaceboDays: false,
      })
    ).toBe(false);
  });
});

describe("resolveOnPlaceboDays", () => {
  it("treats a missing value as on", () => {
    expect(resolveOnPlaceboDays(undefined)).toBe(true);
    expect(resolveOnPlaceboDays(null)).toBe(true);
    expect(resolveOnPlaceboDays(true)).toBe(true);
    expect(resolveOnPlaceboDays(false)).toBe(false);
  });
});
