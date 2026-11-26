import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMobileIdentity: vi.fn<(req: Request, scope: string) => Promise<{ userId: string }>>(),
  getCalendar: vi.fn<(userId: string, query: unknown) => Promise<unknown>>(),
}));

vi.mock("@/lib/mobile/identity", () => ({
  MOBILE_DATA_SCOPE: "data",
  requireMobileIdentity: (req: Request, scope: string) =>
    mocks.requireMobileIdentity(req, scope),
}));

vi.mock("@/lib/calendar/calendarService", () => ({
  getCalendar: (userId: string, query: unknown) => mocks.getCalendar(userId, query),
}));

import { GET } from "@/app/api/mobile/calendar/route";

beforeEach(() => {
  mocks.requireMobileIdentity.mockReset();
  mocks.getCalendar.mockReset();
});

describe("GET /api/mobile/calendar", () => {
  it("parses month and returns the shared calendar DTO", async () => {
    mocks.requireMobileIdentity.mockResolvedValue({ userId: "user-1" });
    mocks.getCalendar.mockResolvedValue({
      month: "2026-03",
      today: "2026-03-10",
      timezone: "UTC",
      days: [],
    });

    const response = await GET(
      new Request("https://bloome.test/api/mobile/calendar?month=2026-03")
    );

    expect(response.status).toBe(200);
    expect(mocks.getCalendar).toHaveBeenCalledWith("user-1", { month: "2026-03" });
    await expect(response.json()).resolves.toMatchObject({ month: "2026-03" });
  });

  it("rejects an invalid month before touching the service", async () => {
    mocks.requireMobileIdentity.mockResolvedValue({ userId: "user-1" });

    const response = await GET(
      new Request("https://bloome.test/api/mobile/calendar?month=nope")
    );

    expect(response.status).toBe(400);
    expect(mocks.getCalendar).not.toHaveBeenCalled();
  });
});
