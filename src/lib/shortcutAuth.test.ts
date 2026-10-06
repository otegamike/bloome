import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

// server-only throws outside the Next.js server runtime; stub it for tests.
vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findToken: vi.fn(),
  findAttempt: vi.fn(),
  createAttempt: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ connectDB: (...args: unknown[]) => mocks.connectDB(...args) }));

vi.mock("@/models/ShortcutToken", () => ({
  default: {
    findOne: (...args: unknown[]) => mocks.findToken(...args),
  },
}));

vi.mock("@/models/AuthAttempt", () => ({
  default: {
    findOne: (...args: unknown[]) => mocks.findAttempt(...args),
    create: (...args: unknown[]) => mocks.createAttempt(...args),
    deleteOne: async () => ({}),
  },
}));

import { ApiError } from "@/lib/apiErrors";
import { authenticateShortcutRequest, SHORTCUT_AUTH_LIMIT } from "@/lib/shortcutAuth";
import { generateShortcutSecret, hashShortcutSecret } from "@/lib/shortcutTokens";

const URL = "https://app.test/api/shortcuts/status";

function tokenDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    scopes: ["status:read"],
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    save: vi.fn(async () => undefined),
    ...overrides,
  };
}

let leanAttempt: unknown = null;

function wireAuth(token: unknown) {
  mocks.findToken.mockReturnValue({ select: async () => token });
}

async function failure(req: Request): Promise<ApiError> {
  try {
    await authenticateShortcutRequest(req);
    throw new Error("expected authentication to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) {
    fn.mockReset();
  }
  leanAttempt = null;
  mocks.findAttempt.mockImplementation(() => ({
    lean: async () => leanAttempt,
    expiresAt: new Date(0),
    count: 0,
    save: async () => undefined,
  }));
  mocks.connectDB.mockResolvedValue(undefined);
  mocks.createAttempt.mockResolvedValue({});
});

describe("authenticateShortcutRequest", () => {
  it("rejects a token in the query string", async () => {
    const error = await failure(new Request(`${URL}?token=abc`));
    expect(error.status).toBe(400);
    expect(error.message).toBe("Send the token in the Authorization header");
  });

  it("answers every token failure with the identical 401", async () => {
    const cases: Request[] = [
      new Request(URL),
      new Request(URL, { headers: { authorization: "Bearer short" } }),
    ];
    wireAuth(null);
    cases.push(
      new Request(URL, {
        headers: { authorization: `Bearer ${generateShortcutSecret()}` },
      })
    );
    for (const req of cases) {
      const error = await failure(req);
      expect(error.status).toBe(401);
      expect(error.message).toBe("Unauthorized");
      expect(error.headers?.["WWW-Authenticate"]).toBe("Bearer");
    }
    wireAuth(tokenDoc({ revokedAt: new Date() }));
    const revoked = await failure(
      new Request(URL, { headers: { authorization: `Bearer ${generateShortcutSecret()}` } })
    );
    expect(revoked.status).toBe(401);
    expect(revoked.message).toBe("Unauthorized");

    wireAuth(tokenDoc({ expiresAt: new Date(Date.now() - 1000) }));
    const expired = await failure(
      new Request(URL, { headers: { authorization: `Bearer ${generateShortcutSecret()}` } })
    );
    expect(expired.status).toBe(401);
    expect(expired.message).toBe("Unauthorized");
  });

  it("authenticates a valid token and refreshes a stale lastUsedAt", async () => {
    const doc = tokenDoc({ lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) });
    wireAuth(doc);
    const secret = generateShortcutSecret();
    // Lookup runs on the hash, never the secret itself.
    const auth = await authenticateShortcutRequest(
      new Request(URL, { headers: { authorization: `Bearer ${secret}` } })
    );
    expect(auth.userId).toBe(doc.userId.toString());
    expect(auth.tokenId).toBe(doc._id.toString());
    expect(mocks.findToken).toHaveBeenCalledWith({
      tokenHash: hashShortcutSecret(secret),
    });
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it("returns 429 once the IP failure budget is spent", async () => {
    expect(SHORTCUT_AUTH_LIMIT).toBe(20);
    leanAttempt = {
      count: 20,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const error = await failure(new Request(URL));
    expect(error.status).toBe(429);
    expect(error.headers?.["Retry-After"]).toBeDefined();
    expect(mocks.findToken).not.toHaveBeenCalled();
  });
});
