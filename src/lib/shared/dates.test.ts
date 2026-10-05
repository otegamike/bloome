import { describe, expect, it } from "vitest";

import {
  addDays,
  compareDays,
  diffInDays,
  isValidDay,
  isValidMonth,
  isValidTimezone,
  localTimeInTz,
  monthDays,
  todayInTz,
} from "@/lib/shared/dates";

describe("addDays / diffInDays", () => {
  it("crosses month ends", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(diffInDays("2026-01-31", "2026-02-01")).toBe(1);
  });

  it("handles leap day", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(diffInDays("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("is stable across US daylight-saving changes", () => {
    // Spring forward (2026-03-08) and fall back (2026-11-01) in New York.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(diffInDays("2026-03-07", "2026-03-09")).toBe(2);
  });

  it("matches a zone without DST", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(diffInDays("2026-01-01", "2026-12-31")).toBe(364);
  });

  it("goes backwards", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffInDays("2026-02-01", "2026-01-01")).toBe(-31);
  });
});

describe("compareDays", () => {
  it("orders day strings", () => {
    expect(compareDays("2026-01-01", "2026-01-02")).toBe(-1);
    expect(compareDays("2026-01-02", "2026-01-02")).toBe(0);
    expect(compareDays("2026-01-03", "2026-01-02")).toBe(1);
  });
});

describe("todayInTz", () => {
  it("gives different days each side of the date line at the same instant", () => {
    const instant = new Date("2026-06-01T06:30:00Z");
    expect(todayInTz("Pacific/Auckland", instant)).toBe("2026-06-01");
    expect(todayInTz("America/Los_Angeles", instant)).toBe("2026-05-31");
  });
});

describe("localTimeInTz", () => {
  it("reads the wall clock in the given zone", () => {
    expect(localTimeInTz("Africa/Lagos", new Date("2026-01-15T20:00:00Z"))).toBe("21:00");
  });
});

describe("isValidDay", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isValidDay("2026-05-04")).toBe(true);
    expect(isValidDay("2024-02-29")).toBe(true);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("2026-13-01")).toBe(false);
    expect(isValidDay("not-a-day")).toBe(false);
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA names and rejects junk", () => {
    expect(isValidTimezone("Africa/Lagos")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Mars/Olympus")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
});

describe("monthDays / isValidMonth", () => {
  it("lists every day of a leap February", () => {
    const days = monthDays("2024-02");
    expect(days).toHaveLength(29);
    expect(days[0]).toBe("2024-02-01");
    expect(days[28]).toBe("2024-02-29");
  });

  it("validates month strings", () => {
    expect(isValidMonth("2026-05")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-5")).toBe(false);
  });
});
