import { beforeEach, describe, expect, it, vi } from "vitest";

import { monthsInRange } from "@/lib/shared/dates";
import type { CalendarBatchResponse } from "@/types/api";

const { getCalendarRangeMock } = vi.hoisted(() => ({ getCalendarRangeMock: vi.fn() }));

vi.mock("@/client/apiClient", () => ({
  deleteLog: vi.fn(),
  deletePeriod: vi.fn(),
  getCalendarRange: getCalendarRangeMock,
  handleAuthError: vi.fn(),
  putLog: vi.fn(),
  startPeriod: vi.fn(),
}));

import { seedMonths } from "@/client/calendarGrid";
import { useCalendarStore } from "@/store/useCalendarStore";

function batchResponse(from: string, to: string): CalendarBatchResponse {
  return {
    months: monthsInRange(from, to).map((month) => ({
      month,
      today: "2026-10-05",
      timezone: "UTC",
      days: [],
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useCalendarStore.setState({
    months: {},
    today: null,
    timezone: null,
    justChanged: {},
    pending: {},
    epoch: 0,
  });
});

describe("calendar batching", () => {
  it("loads a five-month window in a single range request", async () => {
    getCalendarRangeMock.mockImplementation(async (from: string, to: string) =>
      batchResponse(from, to),
    );
    await useCalendarStore.getState().fetchMonths(seedMonths("2026-10"));
    expect(getCalendarRangeMock).toHaveBeenCalledTimes(1);
    expect(getCalendarRangeMock).toHaveBeenCalledWith("2026-08", "2026-12");
    expect(useCalendarStore.getState().months["2026-10"]?.status).toBe("ready");
  });

  it("never refetches a ready month", async () => {
    getCalendarRangeMock.mockImplementation(async (from: string, to: string) =>
      batchResponse(from, to),
    );
    await useCalendarStore.getState().fetchMonths(["2026-10"]);
    const calls = getCalendarRangeMock.mock.calls.length;
    await useCalendarStore.getState().fetchMonths(["2026-10"]);
    expect(getCalendarRangeMock.mock.calls.length).toBe(calls);
  });
});
