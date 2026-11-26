import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn<(token: string) => Promise<unknown>>(),
  isRateLimited: vi.fn<(key: string, limit: number) => Promise<boolean>>(),
  retryAfterSeconds: vi.fn<(key: string) => Promise<number>>(),
  recordRateLimitHit: vi.fn<(key: string, windowMs: number) => Promise<void>>(),
}));

vi.mock("./authService", () => ({
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

import { requireMobileIdentity } from "@/lib/mobile/identity";
import { MOBILE_DATA_SCOPE, generateAccessToken } from "@/lib/mobile/tokens";

const token = generateAccessToken();
const identity = { userId: "user-1", deviceId: "device-1", scopes: [MOBILE_DATA_SCOPE] };

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://bloome.test/api/mobile/me", { headers });
}

beforeEach(() => {
  mocks.authenticate.mockReset();
  mocks.isRateLimited.mockReset().mockResolvedValue(false);
  mocks.retryAfterSeconds.mockReset().mockResolvedValue(0);
  mocks.recordRateLimitHit.mockReset().mockResolvedValue(undefined);
});

describe("requireMobileIdentity", () => {
  it("returns the identity for a valid bearer token with the data scope", async () => {
    mocks.authenticate.mockResolvedValue(identity);

    await expect(
      requireMobileIdentity(request({ authorization: `Bearer ${token}` }), MOBILE_DATA_SCOPE)
    ).resolves.toEqual(identity);
    expect(mocks.authenticate).toHaveBeenCalledWith(token);
  });

  it("does not fall back to an Auth.js cookie", async () => {
    const req = request({ cookie: "authjs.session-token=abc" });

    await expect(requireMobileIdentity(req, MOBILE_DATA_SCOPE)).rejects.toMatchObject({
      status: 401,
    });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("rejects a malformed Authorization header", async () => {
    await expect(
      requireMobileIdentity(request({ authorization: "Basic abc" }), MOBILE_DATA_SCOPE)
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("rejects an unknown or expired token and counts the failure", async () => {
    mocks.authenticate.mockResolvedValue(null);

    await expect(
      requireMobileIdentity(request({ authorization: `Bearer ${token}` }), MOBILE_DATA_SCOPE)
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.recordRateLimitHit).toHaveBeenCalledTimes(1);
  });

  it("rejects a token without the required scope", async () => {
    mocks.authenticate.mockResolvedValue({ ...identity, scopes: ["other"] });

    await expect(
      requireMobileIdentity(request({ authorization: `Bearer ${token}` }), MOBILE_DATA_SCOPE)
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.recordRateLimitHit).toHaveBeenCalledTimes(1);
  });

  it("returns 429 when the failure bucket is full", async () => {
    mocks.isRateLimited.mockResolvedValue(true);
    mocks.retryAfterSeconds.mockResolvedValue(42);

    await expect(requireMobileIdentity(request(), MOBILE_DATA_SCOPE)).rejects.toMatchObject({
      status: 429,
      headers: { "Retry-After": "42" },
    });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });
});
