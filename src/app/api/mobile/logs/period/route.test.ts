import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn<(token: string) => Promise<unknown>>(),
  isRateLimited: vi.fn<(key: string, limit: number) => Promise<boolean>>(),
  retryAfterSeconds: vi.fn<(key: string) => Promise<number>>(),
  recordRateLimitHit: vi.fn<(key: string, windowMs: number) => Promise<void>>(),
  startPeriod: vi.fn<(userId: string, day: string) => Promise<unknown>>(),
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
  startPeriod: (userId: string, day: string) => mocks.startPeriod(userId, day),
}));

import { POST } from "@/app/api/mobile/logs/period/route";
import { generateAccessToken } from "@/lib/mobile/tokens";

const token = generateAccessToken();
const identity = { userId: "user-1", deviceId: "device-1", scopes: ["data"] };
const url = "https://bloome.test/api/mobile/logs/period";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.authenticate.mockReset();
  mocks.isRateLimited.mockReset().mockResolvedValue(false);
  mocks.retryAfterSeconds.mockReset().mockResolvedValue(0);
  mocks.recordRateLimitHit.mockReset().mockResolvedValue(undefined);
  mocks.startPeriod.mockReset();
});

describe("POST /api/mobile/logs/period", () => {
  it("rejects a missing bearer token", async () => {
    const response = await POST(request({ day: "2026-03-10" }));

    expect(response.status).toBe(401);
    expect(mocks.startPeriod).not.toHaveBeenCalled();
  });

  it("starts a period and returns the web route shape", async () => {
    const days = [{ day: "2026-03-10" }];
    mocks.authenticate.mockResolvedValue(identity);
    mocks.startPeriod.mockResolvedValue(days);

    const response = await POST(
      request({ day: "2026-03-10" }, { authorization: `Bearer ${token}` })
    );

    expect(response.status).toBe(200);
    expect(mocks.startPeriod).toHaveBeenCalledWith("user-1", "2026-03-10");
    await expect(response.json()).resolves.toEqual({ days });
  });

  it("rejects an invalid day before calling the service", async () => {
    mocks.authenticate.mockResolvedValue(identity);

    const response = await POST(
      request({ day: "03/10/2026" }, { authorization: `Bearer ${token}` })
    );

    expect(response.status).toBe(400);
    expect(mocks.startPeriod).not.toHaveBeenCalled();
  });
});
