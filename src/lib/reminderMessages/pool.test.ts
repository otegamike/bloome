import { describe, expect, it } from "vitest";

import { CURATED_MESSAGES } from "@/lib/reminderMessages/pool";
import { isSafeMessage, normalizeMessage } from "@/lib/reminderMessages/validate";

describe("curated message bank", () => {
  it("holds at least 60 messages with unique ids", () => {
    expect(CURATED_MESSAGES.length).toBeGreaterThanOrEqual(60);
    const ids = CURATED_MESSAGES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("passes every message through the safety validator", () => {
    for (const message of CURATED_MESSAGES) {
      expect(isSafeMessage(message.text), message.id).toBe(true);
    }
  });

  it("has no two messages with equal normalized text", () => {
    const normalized = CURATED_MESSAGES.map((m) => normalizeMessage(m.text));
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it("uses {name} in at most a quarter of the messages", () => {
    const withName = CURATED_MESSAGES.filter((m) => m.usesName).length;
    expect(withName).toBeLessThanOrEqual(CURATED_MESSAGES.length / 4);
  });
});
