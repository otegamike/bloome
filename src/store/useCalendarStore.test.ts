import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarResponse } from "@/types/api";

const { getCalendarMock } = vi.hoisted(() => ({ getCalendarMock: vi.fn() }));

vi.mock("@/client/apiClient", () => ({
  deleteLog: vi.fn(),
  getCalendar: getCalendarMock,
  handleAuthError: vi.fn(),
  putLog: vi.fn(),
}));

import { useCalendarStore } from "@/store/useCalendarStore";

function calendarResponse(month: string): CalendarResponse {
  return { month, today: "2026-10-05", timezone: "UTC", days: [] };
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

describe("calendar prefetch", () => {
  it("loads a month plus its two neighbors, then stops", async () => {
    getCalendarMock.mockImplementation(async (month: string) => calendarResponse(month));
    await useCalendarStore.getState().fetchMonth("2026-10");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const requested = getCalendarMock.mock.calls.map((call) => call[0] as string).sort();
    expect(requested).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("never refetches a ready month", async () => {
    getCalendarMock.mockImplementation(async (month: string) => calendarResponse(month));
    await useCalendarStore.getState().fetchMonth("2026-10");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const calls = getCalendarMock.mock.calls.length;
    await useCalendarStore.getState().fetchMonth("2026-10");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getCalendarMock.mock.calls.length).toBe(calls);
  });
});
