import { describe, expect, it, vi } from "vitest";

// server-only throws outside the Next.js server runtime; stub it for tests.
vi.mock("server-only", () => ({}));

import {
  generateShortcutSecret,
  hashShortcutSecret,
  lastFourOfSecret,
  parseShortcutBearer,
  SHORTCUT_TOKEN_SECRET_PATTERN,
} from "@/lib/shortcutTokens";

describe("shortcut token helpers", () => {
  it("generates secrets matching ^bsc_[A-Za-z0-9_-]{43}$", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const secret = generateShortcutSecret();
      expect(secret).toMatch(SHORTCUT_TOKEN_SECRET_PATTERN);
      seen.add(secret);
    }
    expect(seen.size).toBe(20);
  });

  it("hashes stably and distinctly", () => {
    const a = generateShortcutSecret();
    const b = generateShortcutSecret();
    expect(hashShortcutSecret(a)).toBe(hashShortcutSecret(a));
    expect(hashShortcutSecret(a)).not.toBe(hashShortcutSecret(b));
    expect(hashShortcutSecret(a)).toHaveLength(64);
  });

  it("exposes only the last four characters for recognition", () => {
    const secret = generateShortcutSecret();
    expect(lastFourOfSecret(secret)).toBe(secret.slice(-4));
  });

  it("parses only well-formed bearer headers", () => {
    const secret = generateShortcutSecret();
    expect(parseShortcutBearer(`Bearer ${secret}`)).toBe(secret);
    expect(parseShortcutBearer(null)).toBeNull();
    expect(parseShortcutBearer("")).toBeNull();
    expect(parseShortcutBearer(secret)).toBeNull();
    expect(parseShortcutBearer("Bearer short")).toBeNull();
    expect(parseShortcutBearer("Bearer bsc_not-base64url!*")).toBeNull();
    expect(parseShortcutBearer("Basic abc")).toBeNull();
  });
});
