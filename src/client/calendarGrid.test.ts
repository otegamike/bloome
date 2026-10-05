import { describe, expect, it } from "vitest";

import { olderMonths, rangeMonths } from "@/client/calendarGrid";

describe("rangeMonths", () => {
  it("lists every month from lo through hi", () => {
    expect(rangeMonths("2026-10", "2026-12")).toEqual(["2026-10", "2026-11", "2026-12"]);
  });

  it("crosses year boundaries", () => {
    expect(rangeMonths("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("returns a single month when lo equals hi", () => {
    expect(rangeMonths("2026-10", "2026-10")).toEqual(["2026-10"]);
  });
});

describe("olderMonths", () => {
  it("returns the count months just before lo, oldest first", () => {
    expect(olderMonths("2026-10", 5)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("crosses year boundaries", () => {
    expect(olderMonths("2026-01", 3)).toEqual(["2025-10", "2025-11", "2025-12"]);
  });
});
