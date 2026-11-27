import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn<(token: string) => Promise<unknown>>(),
  isRateLimited: vi.fn<(key: string, limit: number) => Promise<boolean>>(),
  retryAfterSeconds: vi.fn<(key: string) => Promise<number>>(),
  recordRateLimitHit: vi.fn<(key: string, windowMs: number) => Promise<void>>(),
  upsertLog: vi.fn<(userId: string, day: string, input: unknown) => Promise<unknown>>(),
  deleteLog: vi.fn<(userId: string, day: string) => Promise<void>>(),
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

vi.mock("@/lib/logs/logService", () => ({
  upsertLog: (userId: string, day: string, input: unknown) =>
    mocks.upsertLog(userId, day, input),
  deleteLog: (userId: string, day: string) => mocks.deleteLog(userId, day),
}));

import { DELETE, PUT } from "@/app/api/mobile/logs/[day]/route";
import { generateAccessToken } from "@/lib/mobile/tokens";

const token = generateAccessToken();
const identity = { userId: "user-1", deviceId: "device-1", scopes: ["data"] };
const params = { params: Promise.resolve({ day: "2026-03-10" }) };
const url = "https://bloome.test/api/mobile/logs/2026-03-10";

function putRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "PUT",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function deleteRequest(headers: Record<string, string> = {}) {
  return new Request(url, { method: "DELETE", headers });
}

beforeEach(() => {
  mocks.authenticate.mockReset();
  mocks.isRateLimited.mockReset().mockResolvedValue(false);
  mocks.retryAfterSeconds.mockReset().mockResolvedValue(0);
  mocks.recordRateLimitHit.mockReset().mockResolvedValue(undefined);
  mocks.upsertLog.mockReset();
  mocks.deleteLog.mockReset();
});

describe("mobile log mutations", () => {
  it("rejects PUT without a bearer token before parsing the body", async () => {
    const response = await PUT(putRequest({ status: "taken" }), params);

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.upsertLog).not.toHaveBeenCalled();
  });

  it("rejects an invalid bearer token with a JSON 401", async () => {
    mocks.authenticate.mockResolvedValue(null);

    const response = await PUT(
      putRequest({ status: "taken" }, { authorization: `Bearer ${token}` }),
      params
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    expect(mocks.authenticate).toHaveBeenCalledWith(token);
    expect(mocks.recordRateLimitHit).toHaveBeenCalledTimes(1);
    expect(mocks.upsertLog).not.toHaveBeenCalled();
  });

  it("parses the body and returns the web route shape", async () => {
    const day = {
      day: "2026-03-10",
      kind: "active",
      state: "taken",
      packId: "pack-1",
      packName: "March",
      dayInPack: 1,
      isPackStart: false,
      isPeriod: false,
      log: {
        status: "taken",
        note: "after breakfast",
        takenAt: "2026-03-10T08:00:00.000Z",
        loggedLate: false,
      },
    };
    mocks.authenticate.mockResolvedValue(identity);
    mocks.upsertLog.mockResolvedValue(day);

    const response = await PUT(
      putRequest(
        { status: "taken", note: "  after breakfast  " },
        { authorization: `Bearer ${token}` }
      ),
      params
    );

    expect(response.status).toBe(200);
    expect(mocks.upsertLog).toHaveBeenCalledWith("user-1", "2026-03-10", {
      status: "taken",
      note: "after breakfast",
    });
    await expect(response.json()).resolves.toEqual({ day });
  });

  it("rejects an invalid body before calling the service", async () => {
    mocks.authenticate.mockResolvedValue(identity);

    const response = await PUT(
      putRequest({ status: "maybe" }, { authorization: `Bearer ${token}` }),
      params
    );

    expect(response.status).toBe(400);
    expect(mocks.upsertLog).not.toHaveBeenCalled();
  });

  it("rejects DELETE without a bearer token", async () => {
    const response = await DELETE(deleteRequest(), params);

    expect(response.status).toBe(401);
    expect(mocks.deleteLog).not.toHaveBeenCalled();
  });

  it("deletes the log and returns 204", async () => {
    mocks.authenticate.mockResolvedValue(identity);

    const response = await DELETE(deleteRequest({ authorization: `Bearer ${token}` }), params);

    expect(response.status).toBe(204);
    expect(mocks.deleteLog).toHaveBeenCalledWith("user-1", "2026-03-10");
    expect(await response.text()).toBe("");
  });
});
