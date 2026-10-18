import { describe, expect, it } from "vitest";

import { monthsInRange } from "@/lib/shared/dates";
import { calendarQuerySchema } from "@/lib/shared/schemas/query";

describe("calendarQuerySchema", () => {
  it("accepts a single month", () => {
    expect(calendarQuerySchema.safeParse({ month: "2026-10" }).success).toBe(true);
  });

  it("accepts a month range", () => {
    expect(calendarQuerySchema.safeParse({ from: "2026-08", to: "2026-12" }).success).toBe(true);
  });

  it("rejects a reversed range", () => {
    expect(calendarQuerySchema.safeParse({ from: "2026-12", to: "2026-08" }).success).toBe(false);
  });

  it("rejects a range longer than the cap", () => {
    expect(calendarQuerySchema.safeParse({ from: "2026-01", to: "2027-02" }).success).toBe(false);
  });

  it("rejects mixing month with a range", () => {
    expect(
      calendarQuerySchema.safeParse({ month: "2026-10", from: "2026-08", to: "2026-09" }).success,
    ).toBe(false);
  });

  it("rejects an incomplete range", () => {
    expect(calendarQuerySchema.safeParse({ from: "2026-08" }).success).toBe(false);
  });
});

describe("monthsInRange", () => {
  it("spans across a year boundary, oldest first", () => {
    expect(monthsInRange("2026-11", "2027-02")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("returns one month when from equals to", () => {
    expect(monthsInRange("2026-10", "2026-10")).toEqual(["2026-10"]);
  });
});
