import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMobileIdentity: vi.fn<(req: Request, scope: string) => Promise<{ userId: string }>>(),
  getMe: vi.fn<(userId: string) => Promise<unknown>>(),
}));

vi.mock("@/lib/mobile/identity", () => ({
  MOBILE_DATA_SCOPE: "data",
  requireMobileIdentity: (req: Request, scope: string) =>
    mocks.requireMobileIdentity(req, scope),
}));

vi.mock("@/lib/account/userService", () => ({
  getMe: (userId: string) => mocks.getMe(userId),
}));

import { GET } from "@/app/api/mobile/me/route";
import { unauthorized } from "@/lib/apiErrors";

const request = new Request("https://bloome.test/api/mobile/me");

beforeEach(() => {
  mocks.requireMobileIdentity.mockReset();
  mocks.getMe.mockReset();
});

describe("GET /api/mobile/me", () => {
  it("returns a JSON 401 from the handler when the bearer is missing", async () => {
    mocks.requireMobileIdentity.mockRejectedValue(unauthorized("Please sign in again"));

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: "Please sign in again" });
  });

  it("returns the shared account DTO for an authenticated device", async () => {
    mocks.requireMobileIdentity.mockResolvedValue({ userId: "user-1" });
    mocks.getMe.mockResolvedValue({ id: "user-1", name: "Rose" });

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "user-1", name: "Rose" });
    expect(mocks.getMe).toHaveBeenCalledWith("user-1");
  });
});
