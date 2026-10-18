import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarBatchResponse } from "@/types/api";

const { getCalendarsMock } = vi.hoisted(() => ({ getCalendarsMock: vi.fn() }));

vi.mock("@/client/apiClient", () => ({
  deleteLog: vi.fn(),
  deletePeriod: vi.fn(),
  getCalendars: getCalendarsMock,
  handleAuthError: vi.fn(),
  putLog: vi.fn(),
  startPeriod: vi.fn(),
}));

import { seedMonths } from "@/client/calendarGrid";
import { useCalendarStore } from "@/store/useCalendarStore";

function batchResponse(months: string[]): CalendarBatchResponse {
  return {
    months: months.map((month) => ({ month, today: "2026-10-05", timezone: "UTC", days: [] })),
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
  it("loads a five-month window in a single request", async () => {
    getCalendarsMock.mockImplementation(async (months: string[]) => batchResponse(months));
    await useCalendarStore.getState().fetchMonths(seedMonths("2026-10"));
    expect(getCalendarsMock).toHaveBeenCalledTimes(1);
    const requested = (getCalendarsMock.mock.calls[0]?.[0] as string[]).sort();
    expect(requested).toEqual(["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
    expect(useCalendarStore.getState().months["2026-10"]?.status).toBe("ready");
  });

  it("never refetches a ready month", async () => {
    getCalendarsMock.mockImplementation(async (months: string[]) => batchResponse(months));
    await useCalendarStore.getState().fetchMonths(["2026-10"]);
    const calls = getCalendarsMock.mock.calls.length;
    await useCalendarStore.getState().fetchMonths(["2026-10"]);
    expect(getCalendarsMock.mock.calls.length).toBe(calls);
  });
});
