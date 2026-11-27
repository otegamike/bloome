import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn<(token: string) => Promise<unknown>>(),
  isRateLimited: vi.fn<(key: string, limit: number) => Promise<boolean>>(),
  retryAfterSeconds: vi.fn<(key: string) => Promise<number>>(),
  recordRateLimitHit: vi.fn<(key: string, windowMs: number) => Promise<void>>(),
  markPeriodDay: vi.fn<(userId: string, day: string) => Promise<unknown>>(),
  removePeriod: vi.fn<(userId: string, day: string) => Promise<unknown>>(),
}));

vi.mock("@/lib/mobile/authService", () => ({
  authenticateMobileAccess: (token: string) => mocks.authenticate(token),
}));

vi.mock("@/lib/rateLimit", () => ({
  clientIp: () => "203.0.113.7",
  isRateLimited: (key: string, limit: number) => mocks.isRateLimited(key, limit),
  retryAfterSeconds: (key: string) => mocks.retryAfterSeconds(key),
  recordRateLimitHit: (key: string, windowMs: number) =>
    mocks.recordRateLimitHit(key, windowMs),
  rateLimitKey: (parts: string[]) => parts.join(":"),
}));

vi.mock("@/lib/logs/periodService", () => ({
  markPeriodDay: (userId: string, day: string) => mocks.markPeriodDay(userId, day),
  removePeriod: (userId: string, day: string) => mocks.removePeriod(userId, day),
}));

import { DELETE, POST } from "@/app/api/mobile/logs/period/[day]/route";
import { generateAccessToken } from "@/lib/mobile/tokens";

const token = generateAccessToken();
const identity = { userId: "user-1", deviceId: "device-1", scopes: ["data"] };
const params = { params: Promise.resolve({ day: "2026-03-10" }) };
const url = "https://bloome.test/api/mobile/logs/period/2026-03-10";

function request(method: string, headers: Record<string, string> = {}) {
  return new Request(url, { method, headers });
}

beforeEach(() => {
  mocks.authenticate.mockReset();
  mocks.isRateLimited.mockReset().mockResolvedValue(false);
  mocks.retryAfterSeconds.mockReset().mockResolvedValue(0);
  mocks.recordRateLimitHit.mockReset().mockResolvedValue(undefined);
  mocks.markPeriodDay.mockReset();
  mocks.removePeriod.mockReset();
});

describe("mobile period day mutations", () => {
  it("rejects POST without a bearer token", async () => {
    const response = await POST(request("POST"), params);

    expect(response.status).toBe(401);
    expect(mocks.markPeriodDay).not.toHaveBeenCalled();
  });

  it("marks a placebo day and returns the web route shape", async () => {
    const days = [{ day: "2026-03-10" }];
    mocks.authenticate.mockResolvedValue(identity);
    mocks.markPeriodDay.mockResolvedValue(days);

    const response = await POST(
      request("POST", { authorization: `Bearer ${token}` }),
      params
    );

    expect(response.status).toBe(200);
    expect(mocks.markPeriodDay).toHaveBeenCalledWith("user-1", "2026-03-10");
    await expect(response.json()).resolves.toEqual({ days });
  });

  it("rejects DELETE with an invalid bearer token", async () => {
    mocks.authenticate.mockResolvedValue(null);

    const response = await DELETE(
      request("DELETE", { authorization: `Bearer ${token}` }),
      params
    );

    expect(response.status).toBe(401);
    expect(mocks.authenticate).toHaveBeenCalledWith(token);
    expect(mocks.removePeriod).not.toHaveBeenCalled();
  });

  it("removes the period run and returns the web route shape", async () => {
    const days = [{ day: "2026-03-10" }];
    mocks.authenticate.mockResolvedValue(identity);
    mocks.removePeriod.mockResolvedValue(days);

    const response = await DELETE(
      request("DELETE", { authorization: `Bearer ${token}` }),
      params
    );

    expect(response.status).toBe(200);
    expect(mocks.removePeriod).toHaveBeenCalledWith("user-1", "2026-03-10");
    await expect(response.json()).resolves.toEqual({ days });
  });
});
