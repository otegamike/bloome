import { describe, expect, it } from "vitest";

import {
  BANNED_MESSAGE_PATTERNS,
  isSafeMessage,
  normalizeMessage,
  sanitizeFirstName,
} from "@/lib/reminderMessages/validate";

describe("isSafeMessage", () => {
  it.each(BANNED_MESSAGE_PATTERNS.map(String))("rejects the banned pattern %s", (pattern) => {
    const probe = pattern.includes("|") ? pattern.split("|")[0] : pattern;
    expect(isSafeMessage(`A gentle reminder about ${probe} today`)).toBe(false);
  });

  it("rejects over-length text, digits, and bad emoji", () => {
    expect(isSafeMessage("x".repeat(81))).toBe(false);
    expect(isSafeMessage("")).toBe(false);
    expect(isSafeMessage("Day 5 of your streak keeps going")).toBe(false);
    expect(isSafeMessage("A calm check-in 🌸 ✨")).toBe(false);
    expect(isSafeMessage("A calm check-in 🫧")).toBe(false);
  });

  it("accepts good examples", () => {
    expect(isSafeMessage("Your daily moment is waiting 🌸")).toBe(true);
    expect(isSafeMessage("A tiny check-in for a lovely day.")).toBe(true);
    expect(isSafeMessage("Hey {name}, a gentle nudge to check in.")).toBe(true);
    expect(isSafeMessage("x".repeat(80))).toBe(true);
  });
});

describe("normalizeMessage", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeMessage("Hey {name}, check in!")).toBe("hey name check in");
  });
});

describe("sanitizeFirstName", () => {
  it("keeps plain names and drops markup", () => {
    expect(sanitizeFirstName("Amara")).toBe("Amara");
    expect(sanitizeFirstName("Mary-Jane O’Neil")).toBe("Mary-Jane O’Neil");
    expect(sanitizeFirstName("  Mike<script>")).toBeNull();
    expect(sanitizeFirstName("R2D2")).toBeNull();
    expect(sanitizeFirstName("")).toBeNull();
    expect(sanitizeFirstName(null)).toBeNull();
    expect(sanitizeFirstName("x".repeat(30))).not.toBeNull();
  });
});
