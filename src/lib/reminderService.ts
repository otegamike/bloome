import "server-only";

import { Types } from "mongoose";

import { connectDB } from "@/lib/db";
import PillLogModel from "@/models/PillLog";
import PillPackModel from "@/models/PillPack";
import UserModel from "@/models/User";
import { getDayKind, resolveAnchor } from "@/lib/shared/cycle";
import { localTimeInTz, todayInTz } from "@/lib/shared/dates";
import { toPackLike } from "@/lib/packService";
import { sendToUser } from "@/lib/pushService";

void PillLogModel;
void PillPackModel;
void UserModel;

const GRACE_MINUTES = 120;
const BATCH_SIZE = 25;

export interface SweepSummary {
  checked: number;
  due: number;
  sent: number;
  removedSubscriptions: number;
  durationMs: number;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

async function processUser(
  userId: Types.ObjectId,
  previousSentDay: string | null,
  localDay: string,
  summary: { due: number; sent: number; removedSubscriptions: number },
): Promise<void> {
  // Skip days with nothing to take, or days already logged.
  const packs = await PillPackModel.find({ userId });
  const anchor = resolveAnchor(packs.map(toPackLike), localDay);
  const kind = anchor
    ? getDayKind(anchor.startDay, anchor.activeDays, anchor.placeboDays, localDay)
    : "outside";
  if (kind !== "active") return;
  const logged = await PillLogModel.findOne({ userId, day: localDay }).select("_id").lean();
  if (logged) return;

  // Claim first so overlapping sweeps never double-send.
  const claimed = await UserModel.updateOne(
    { _id: userId, "reminder.lastSentDay": { $ne: localDay } },
    { $set: { "reminder.lastSentDay": localDay } },
  );
  if (claimed.modifiedCount !== 1) return;
  summary.due += 1;

  const user = await UserModel.findById(userId);
  if (!user) return;
  const { sent, removed } = await sendToUser(user);
  summary.sent += sent;
  summary.removedSubscriptions += removed;
  if (sent === 0 && removed === 0) {
    // Nothing arrived and nothing expired: let the next sweep retry.
    await UserModel.updateOne(
      { _id: userId, "reminder.lastSentDay": localDay },
      { $set: { "reminder.lastSentDay": previousSentDay } },
    );
  }
}

export async function runReminderSweep(now: Date = new Date()): Promise<SweepSummary> {
  const started = Date.now();
  await connectDB();
  const users = await UserModel.find({
    "reminder.enabled": true,
    pushSubscriptions: { $ne: [] },
  })
    .select("timezone reminder")
    .lean();
  const summary = { checked: users.length, due: 0, sent: 0, removedSubscriptions: 0 };
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((u) => {
        const tz = u.timezone || "UTC";
        const localDay = todayInTz(tz, now);
        const gap = toMinutes(localTimeInTz(tz, now)) - toMinutes(u.reminder.time);
        const due = gap >= 0 && gap <= GRACE_MINUTES && u.reminder.lastSentDay !== localDay;
        if (!due) return Promise.resolve();
        return processUser(u._id, u.reminder.lastSentDay ?? null, localDay, summary);
      }),
    );
  }
  return { ...summary, durationMs: Date.now() - started };
}
