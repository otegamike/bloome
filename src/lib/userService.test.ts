import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

// server-only throws outside the Next.js server runtime; stub it for tests.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));

const mocks = vi.hoisted(() => ({
  updateOne: vi.fn(),
  findById: vi.fn(),
}));

vi.mock("@/models/User", () => ({
  default: {
    updateOne: (...args: unknown[]) => mocks.updateOne(...args),
    findById: (...args: unknown[]) => mocks.findById(...args),
  },
}));

import { toMeResponse, updateMe } from "@/lib/userService";

const userId = new Types.ObjectId().toString();

function docWith(reminder: Record<string, unknown>) {
  return {
    _id: new Types.ObjectId(userId),
    name: "Rose",
    email: "rose@example.com",
    image: null,
    providers: ["credentials"],
    timezone: "UTC",
    theme: "blush",
    reminder: { enabled: true, time: "08:00", ...reminder },
    pushSubscriptions: [],
  };
}

beforeEach(() => {
  mocks.updateOne.mockReset();
  mocks.findById.mockReset();
});

describe("updateMe partial reminder updates", () => {
  it("toggles onPlaceboDays without touching enabled, time, or lastSentDay", async () => {
    const existing = docWith({
      onPlaceboDays: true,
      lastSentDay: "2026-01-01",
    });
    mocks.findById.mockResolvedValue(existing);
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mocks.findById.mockResolvedValue({
      ...existing,
      reminder: { ...existing.reminder, onPlaceboDays: false },
    });

    const result = await updateMe(userId, { reminder: { onPlaceboDays: false } });

    expect(mocks.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = mocks.updateOne.mock.calls[0] as [
      { _id: Types.ObjectId },
      { $set: Record<string, unknown> },
    ];
    expect(filter._id.toString()).toBe(userId);
    expect(update).toEqual({ $set: { "reminder.onPlaceboDays": false } });
    expect(result.reminder).toEqual({
      enabled: true,
      time: "08:00",
      onPlaceboDays: false,
    });
  });

  it("sends enabled and time without resetting onPlaceboDays", async () => {
    const existing = docWith({ onPlaceboDays: false, lastSentDay: "2026-01-01" });
    mocks.findById.mockResolvedValue({
      ...existing,
      reminder: { ...existing.reminder, enabled: false, time: "21:30" },
    });
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await updateMe(userId, {
      reminder: { enabled: false, time: "21:30" },
    });

    const [, update] = mocks.updateOne.mock.calls[0] as [
      unknown,
      { $set: Record<string, unknown> },
    ];
    expect(update).toEqual({
      $set: { "reminder.enabled": false, "reminder.time": "21:30" },
    });
    expect(result.reminder.onPlaceboDays).toBe(false);
  });

  it("reads a document without onPlaceboDays as true", async () => {
    const legacy = docWith({ lastSentDay: null });
    delete (legacy.reminder as Record<string, unknown>).onPlaceboDays;
    mocks.findById.mockResolvedValue(legacy);

    const result = await updateMe(userId, {});

    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(result.reminder.onPlaceboDays).toBe(true);
    expect(toMeResponse(legacy as never).reminder.onPlaceboDays).toBe(true);
  });
});
