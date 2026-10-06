import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

// server-only throws outside the Next.js server runtime; stub it for tests.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));

const mocks = vi.hoisted(() => ({
  findUsers: vi.fn(),
  updateOne: vi.fn(),
  findUserById: vi.fn(),
  findPacks: vi.fn(),
  findLog: vi.fn(),
  sendToUser: vi.fn(),
  pickMessage: vi.fn(),
}));

vi.mock("@/models/User", () => ({
  default: {
    find: (...args: unknown[]) => mocks.findUsers(...args),
    updateOne: (...args: unknown[]) => mocks.updateOne(...args),
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

vi.mock("@/lib/pushService", () => ({
  sendToUser: (...args: unknown[]) => mocks.sendToUser(...args),
}));

vi.mock("@/lib/reminderMessages/pick", () => ({
  pickMessage: (...args: unknown[]) => mocks.pickMessage(...args),
}));

import { runReminderSweep } from "@/lib/reminderService";

// Pack starting 2026-01-01 with 21 active + 7 placebo days:
// 2026-01-05 is active, 2026-01-22 is placebo.
function packDoc() {
  return {
    _id: new Types.ObjectId(),
    name: "Levofem",
    startDay: "2026-01-01",
    activeDays: 21,
    placeboDays: 7,
  };
}

function sweepUser(onPlaceboDays: boolean | undefined) {
  const reminder: Record<string, unknown> = {
    enabled: true,
    time: "20:00",
    lastSentDay: "2026-01-01",
  };
  if (onPlaceboDays !== undefined) {
    reminder.onPlaceboDays = onPlaceboDays;
  }
  return {
    _id: new Types.ObjectId(),
    timezone: "UTC",
    reminder,
  };
}

function wireSweep(user: Record<string, unknown>, logged: unknown) {
  mocks.findUsers.mockReturnValue({
    select: () => ({ lean: async () => [user] }),
  });
  mocks.findPacks.mockResolvedValue([packDoc()]);
  mocks.findLog.mockReturnValue({
    select: () => ({ lean: async () => logged }),
  });
  mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
  mocks.findUserById.mockResolvedValue({ _id: user._id, name: "Amara Rose" });
  mocks.sendToUser.mockResolvedValue({ sent: 1, removed: 0 });
  mocks.pickMessage.mockResolvedValue("A calm minute for today's check-in 🌙");
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) {
    fn.mockReset();
  }
});

describe("runReminderSweep placebo preference", () => {
  it("sends one reminder on a placebo day with the setting on", async () => {
    wireSweep(sweepUser(true), null);
    const summary = await runReminderSweep(new Date(Date.UTC(2026, 0, 22, 20, 5)));
    expect(summary.sent).toBe(1);
    expect(mocks.sendToUser).toHaveBeenCalledTimes(1);
    expect(mocks.pickMessage).toHaveBeenCalledWith({
      userId: expect.any(String),
      localDay: "2026-01-22",
      firstName: "Amara",
    });
    expect(mocks.sendToUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Amara Rose" }),
      "A calm minute for today's check-in 🌙"
    );
  });

  it("treats a missing setting as on", async () => {
    wireSweep(sweepUser(undefined), null);
    const summary = await runReminderSweep(new Date(Date.UTC(2026, 0, 22, 20, 5)));
    expect(summary.sent).toBe(1);
  });

  it("skips a placebo day with the setting off", async () => {
    wireSweep(sweepUser(false), null);
    const summary = await runReminderSweep(new Date(Date.UTC(2026, 0, 22, 20, 5)));
    expect(summary.sent).toBe(0);
    expect(mocks.sendToUser).not.toHaveBeenCalled();
  });

  it("still reminds on an unlogged active day with the setting off", async () => {
    wireSweep(sweepUser(false), null);
    const summary = await runReminderSweep(new Date(Date.UTC(2026, 0, 5, 20, 5)));
    expect(summary.sent).toBe(1);
  });
});
