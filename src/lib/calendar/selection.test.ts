import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiErrors";
import { selectCalendar } from "@/lib/calendar/selection";

describe("selectCalendar", () => {
  it("selects a single month", () => {
    expect(selectCalendar({ month: "2026-03" })).toEqual({ month: "2026-03" });
  });

  it("expands a month range to every month in it", () => {
    expect(selectCalendar({ from: "2026-01", to: "2026-03" })).toEqual({
      months: ["2026-01", "2026-02", "2026-03"],
    });
  });

  it("rejects a query with neither a month nor a range", () => {
    expect(() => selectCalendar({})).toThrow(ApiError);
  });
});
