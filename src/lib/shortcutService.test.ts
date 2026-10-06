import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

// server-only throws outside the Next.js server runtime; stub it for tests.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({ connectDB: async () => undefined }));

const mocks = vi.hoisted(() => ({
  findUserById: vi.fn(),
  findPacks: vi.fn(),
  findLog: vi.fn(),
  pickMessage: vi.fn(),
}));

vi.mock("@/models/User", () => ({
  default: {
    findById: (...args: unknown[]) => mocks.findUserById(...args),
  },
}));

vi.mock("@/models/PillPack", () => ({
  default: {
    find: (...args: unknown[]) => mocks.findPacks(...args),
  },
}));

vi.mock("@/models/PillLog", () => ({
  default: {
    findOne: (...args: unknown[]) => mocks.findLog(...args),
  },
}));

vi.mock("@/lib/reminderMessages/pick", () => ({
  pickMessage: (...args: unknown[]) => mocks.pickMessage(...args),
}));

import { getShortcutStatus } from "@/lib/shortcutService";

const userId = new Types.ObjectId().toString();

function packDoc() {
  return {
    _id: new Types.ObjectId(),
    name: "Levofem",
    startDay: "2026-01-01",
    activeDays: 21,
    placeboDays: 7,
  };
}

function wireStatus(onPlaceboDays: unknown, logged: unknown, packs: unknown[] = [packDoc()]) {
  mocks.findUserById.mockReturnValue({
    select: () => ({
      lean: async () => ({
        name: "Amara Rose",
        timezone: "UTC",
        reminder: { onPlaceboDays },
      }),
    }),
  });
  mocks.findPacks.mockResolvedValue(packs);
  mocks.findLog.mockReturnValue({
    select: () => ({ lean: async () => logged }),
  });
  mocks.pickMessage.mockResolvedValue("Your daily moment is waiting 🌸");
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) {
    fn.mockReset();
  }
});

describe("getShortcutStatus contract", () => {
  it("returns the full envelope on an unlogged active day", async () => {
    wireStatus(true, null);
    const status = await getShortcutStatus({
      userId,
      now: new Date(Date.UTC(2026, 0, 5, 20, 5)),
    });
    expect(status).toEqual({
      ok: true,
      date: "2026-01-05",
      remind: 1,
      marked: 0,
      title: "Bloome",
      message: "Your daily moment is waiting 🌸",
    });
    expect(mocks.pickMessage).toHaveBeenCalledWith({
      userId,
      localDay: "2026-01-05",
      firstName: "Amara",
    });
  });

  it("follows the placebo setting and keeps marked at 0 either way", async () => {
    wireStatus(true, null);
    const on = await getShortcutStatus({
      userId,
      now: new Date(Date.UTC(2026, 0, 22, 20, 5)),
    });
    expect(on.remind).toBe(1);
    expect(on.marked).toBe(0);

    wireStatus(false, null);
    const off = await getShortcutStatus({
      userId,
      now: new Date(Date.UTC(2026, 0, 22, 20, 5)),
    });
    expect(off.remind).toBe(0);
    expect(off.marked).toBe(0);
  });

  it("stays quiet once logged and never reminds outside any pack", async () => {
    wireStatus(false, { _id: new Types.ObjectId() });
    const logged = await getShortcutStatus({
      userId,
      now: new Date(Date.UTC(2026, 0, 5, 20, 5)),
    });
    expect(logged).toMatchObject({ remind: 0, marked: 1 });

    wireStatus(true, null, []);
    const outside = await getShortcutStatus({
      userId,
      now: new Date(Date.UTC(2025, 11, 31, 20, 5)),
    });
    expect(outside).toMatchObject({ remind: 0, marked: 0 });
  });

  it("uses the ?tz override for today", async () => {
    wireStatus(true, null);
    const status = await getShortcutStatus({
      userId,
      timezone: "Pacific/Auckland",
      now: new Date(Date.UTC(2026, 0, 5, 10, 0)),
    });
    // 10:00 UTC is 23:00 the same day in Auckland in January (+13).
    expect(status.date).toBe("2026-01-05");
    const statusDayBefore = await getShortcutStatus({
      userId,
      timezone: "America/New_York",
      now: new Date(Date.UTC(2026, 0, 5, 2, 0)),
    });
    expect(statusDayBefore.date).toBe("2026-01-04");
  });
});
