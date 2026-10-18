import { describe, expect, it } from "vitest";

import type { PackLike } from "@/types/api";

import { buildDays, getDayKind, getDayState, periodDaysFor, placeboIndex, resolveAnchor } from "@/lib/shared/cycle";

const PACK_21_7: PackLike = {
  id: "pack-a",
  name: "Levofem",
  startDay: "2026-01-01",
  activeDays: 21,
  placeboDays: 7,
};

describe("getDayKind with a 21 + 7 pack", () => {
  it("marks the cycle positions correctly", () => {
    expect(getDayKind("2026-01-01", 21, 7, "2026-01-01")).toBe("active"); // day 0
    expect(getDayKind("2026-01-01", 21, 7, "2026-01-21")).toBe("active"); // day 20
    expect(getDayKind("2026-01-01", 21, 7, "2026-01-22")).toBe("placebo"); // day 21
    expect(getDayKind("2026-01-01", 21, 7, "2026-01-28")).toBe("placebo"); // day 27
    expect(getDayKind("2026-01-01", 21, 7, "2026-01-29")).toBe("active"); // day 28, new cycle
  });

  it("calls days before the pack start outside", () => {
    expect(getDayKind("2026-01-01", 21, 7, "2025-12-31")).toBe("outside");
  });

  it("never calls a continuous-pack day placebo", () => {
    expect(getDayKind("2026-01-01", 28, 0, "2026-04-11")).toBe("active"); // day 100
  });
});

describe("resolveAnchor", () => {
  const packB: PackLike = { ...PACK_21_7, id: "pack-b", name: "Other", startDay: "2026-03-01" };

  it("returns null before the first pack", () => {
    expect(resolveAnchor([PACK_21_7], "2025-12-31")).toBeNull();
  });

  it("picks the latest pack at or before the day", () => {
    expect(resolveAnchor([PACK_21_7, packB], "2026-02-15")?.id).toBe("pack-a");
    expect(resolveAnchor([PACK_21_7, packB], "2026-03-01")?.id).toBe("pack-b");
    expect(resolveAnchor([packB, PACK_21_7], "2026-04-01")?.id).toBe("pack-b");
  });
});

describe("getDayState", () => {
  it("never calls a placebo day missed", () => {
    expect(
      getDayState({ kind: "placebo", day: "2026-01-22", today: "2026-03-01" }),
    ).toBe("placebo");
  });

  it("reads a log on a placebo day as placeboTaken or placeboSkipped", () => {
    const base = { kind: "placebo" as const, day: "2026-01-22", today: "2026-03-01" };
    expect(
      getDayState({
        ...base,
        log: { status: "taken", note: null, takenAt: "2026-01-22T08:00:00Z", loggedLate: false },
      }),
    ).toBe("placeboTaken");
    expect(
      getDayState({
        ...base,
        log: { status: "skipped", note: null, takenAt: "2026-01-22T08:00:00Z", loggedLate: false },
      }),
    ).toBe("placeboSkipped");
  });

  it("calls a past active day without a log missed", () => {
    expect(getDayState({ kind: "active", day: "2026-02-10", today: "2026-03-01" })).toBe("missed");
  });

  it("calls today without a log today and future days upcoming", () => {
    expect(getDayState({ kind: "active", day: "2026-03-01", today: "2026-03-01" })).toBe("today");
    expect(getDayState({ kind: "active", day: "2026-03-02", today: "2026-03-01" })).toBe(
      "upcoming",
    );
  });

  it("takes taken and skipped from the log", () => {
    const base = { kind: "active" as const, day: "2026-02-10", today: "2026-03-01" };
    expect(
      getDayState({
        ...base,
        log: { status: "taken", note: null, takenAt: "2026-02-10T08:00:00Z", loggedLate: false },
      }),
    ).toBe("taken");
    expect(
      getDayState({
        ...base,
        log: { status: "skipped", note: null, takenAt: "2026-02-10T08:00:00Z", loggedLate: false },
      }),
    ).toBe("skipped");
  });
});

describe("buildDays", () => {
  it("flags the restart day of a new cycle", () => {
    const days = buildDays({
      packs: [PACK_21_7],
      logs: {},
      days: ["2026-01-29"],
      today: "2026-03-01",
      periodDays: new Set(),
    });
    expect(days[0]?.kind).toBe("active");
    expect(days[0]?.dayInPack).toBe(1);
    expect(days[0]?.isPackStart).toBe(true);
  });

  it("keeps earlier days on the old pack when a new anchor starts", () => {
    const packB: PackLike = { ...PACK_21_7, id: "pack-b", name: "Other", startDay: "2026-03-01" };
    const days = buildDays({
      packs: [PACK_21_7, packB],
      logs: {},
      days: ["2026-02-10", "2026-03-05"],
      today: "2026-04-01",
      periodDays: new Set(),
    });
    expect(days[0]?.packId).toBe("pack-a");
    expect(days[0]?.state).toBe("missed");
    expect(days[1]?.packId).toBe("pack-b");
    expect(days[1]?.isPackStart).toBe(false);
  });

  it("shows unlogged gap days as missed, not outside", () => {
    const packB: PackLike = { ...PACK_21_7, id: "pack-b", name: "Other", startDay: "2026-04-15" };
    const days = buildDays({
      packs: [PACK_21_7, packB],
      logs: {},
      days: ["2026-03-10"],
      today: "2026-05-01",
      periodDays: new Set(),
    });
    expect(days[0]?.kind).toBe("active");
    expect(days[0]?.state).toBe("missed");
    expect(days[0]?.packId).toBe("pack-a");
  });

  it("marks days before every pack outside with no pack attached", () => {
    const days = buildDays({
      packs: [PACK_21_7],
      logs: {},
      days: ["2025-12-31"],
      today: "2026-03-01",
      periodDays: new Set(),
    });
    expect(days[0]?.state).toBe("outside");
    expect(days[0]?.packId).toBeNull();
    expect(days[0]?.log).toBeNull();
  });

  it("carries the period overlay without changing the day state", () => {
    const days = buildDays({
      packs: [PACK_21_7],
      logs: {},
      days: ["2026-01-24"],
      today: "2026-03-01",
      periodDays: new Set(["2026-01-24"]),
    });
    expect(days[0]?.state).toBe("placebo");
    expect(days[0]?.isPeriod).toBe(true);
  });

  it("defaults isPeriod to false for unlisted days", () => {
    const days = buildDays({
      packs: [PACK_21_7],
      logs: {},
      days: ["2026-01-24"],
      today: "2026-03-01",
      periodDays: new Set(),
    });
    expect(days[0]?.isPeriod).toBe(false);
  });
});

describe("placeboIndex", () => {
  it("returns a 1-based index inside the placebo block", () => {
    expect(placeboIndex("2026-01-01", 21, 7, "2026-01-22")).toBe(1);
    expect(placeboIndex("2026-01-01", 21, 7, "2026-01-24")).toBe(3);
    expect(placeboIndex("2026-01-01", 21, 7, "2026-01-25")).toBe(4);
    expect(placeboIndex("2026-01-01", 21, 7, "2026-01-28")).toBe(7);
  });

  it("returns null for non-placebo days", () => {
    expect(placeboIndex("2026-01-01", 21, 7, "2026-01-10")).toBeNull();
    expect(placeboIndex("2026-01-01", 21, 7, "2025-12-31")).toBeNull();
  });
});

describe("periodDaysFor", () => {
  it("spans the start day plus four days when started on the third placebo day", () => {
    expect(periodDaysFor("2026-01-01", 21, 7, "2026-01-24")).toEqual([
      "2026-01-24",
      "2026-01-25",
      "2026-01-26",
      "2026-01-27",
      "2026-01-28",
    ]);
  });

  it("clips to the placebo block when started on the fourth placebo day", () => {
    expect(periodDaysFor("2026-01-01", 21, 7, "2026-01-25")).toEqual([
      "2026-01-25",
      "2026-01-26",
      "2026-01-27",
      "2026-01-28",
    ]);
  });

  it("never runs past the end of a short placebo block", () => {
    expect(periodDaysFor("2026-01-01", 21, 3, "2026-01-24")).toEqual(["2026-01-24"]);
  });

  it("returns an empty list for a non-placebo day", () => {
    expect(periodDaysFor("2026-01-01", 21, 7, "2026-01-10")).toEqual([]);
  });
});
