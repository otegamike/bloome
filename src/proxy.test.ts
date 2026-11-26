import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy routing", () => {
  it("lets an unauthenticated mobile data request reach its handler", () => {
    const response = proxy(new NextRequest("https://bloome.test/api/mobile/me"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects an unauthenticated web data request to /login", () => {
    const response = proxy(new NextRequest("https://bloome.test/api/me"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?callbackUrl=");
  });
});
