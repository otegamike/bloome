import "server-only";

import { Types } from "mongoose";

import { badRequest, notFound, unprocessable } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import PeriodDayModel from "@/models/PeriodDay";
import PillLogModel from "@/models/PillLog";
import PillPackModel from "@/models/PillPack";
import UserModel from "@/models/User";
import { buildDays, placeboIndex, periodDaysFor, resolveAnchor } from "@/lib/shared/cycle";
import { isValidDay, todayInTz } from "@/lib/shared/dates";
import { toPackLike } from "@/lib/packService";
import type { DayString } from "@/types";
import type { CalendarDay, LogLike } from "@/types/api";

void PeriodDayModel;
void PillLogModel;
void PillPackModel;
void UserModel;

/** Days in [from, to] that carry the period overlay. */
export async function getPeriodDays(
  userId: Types.ObjectId,
  from: DayString,
  to: DayString,
): Promise<Set<DayString>> {
  const docs = await PeriodDayModel.find({ userId, day: { $gte: from, $lte: to } })
    .select("day")
    .lean();
  return new Set<DayString>(docs.map((doc) => doc.day));
}

/**
 * Start a period on a placebo day. The start day plus up to the next four days
 * are marked as period days, clipped to the pack's placebo block. Idempotent.
 */
export async function startPeriod(userId: string, dayParam: string): Promise<CalendarDay[]> {
  if (!isValidDay(dayParam)) throw badRequest("Day must be YYYY-MM-DD");
  const day = dayParam;
  await connectDB();
  const id = new Types.ObjectId(userId);
  const user = await UserModel.findById(id).select("timezone").lean();
  if (!user) throw notFound("Account not found");
  const packs = await PillPackModel.find({ userId: id });
  const likes = packs.map(toPackLike);
  const anchor = resolveAnchor(likes, day);
  if (!anchor) throw unprocessable("That day is not in a pack");
  const index = placeboIndex(anchor.startDay, anchor.activeDays, anchor.placeboDays, day);
  if (index !== 3 && index !== 4) {
    throw unprocessable("A period can only start on the third or fourth placebo day");
  }
  const range = periodDaysFor(anchor.startDay, anchor.activeDays, anchor.placeboDays, day);
  await PeriodDayModel.bulkWrite(
    range.map((periodDay) => ({
      updateOne: {
        filter: { userId: id, day: periodDay },
        update: { $setOnInsert: { userId: id, day: periodDay } },
        upsert: true,
      },
    })),
  );
  const today = todayInTz(user.timezone);
  const logs = await PillLogModel.find({ userId: id, day: { $in: range } });
  const byDay: Record<string, LogLike | undefined> = {};
  for (const doc of logs) {
    byDay[doc.day] = {
      status: doc.status,
      note: doc.note ?? null,
      takenAt: doc.takenAt.toISOString(),
      loggedLate: doc.loggedLate,
    };
  }
  return buildDays({
    packs: likes,
    logs: byDay,
    days: range,
    today,
    periodDays: new Set<DayString>(range),
  });
}

/** Remove the period overlay from one day. Idempotent. */
export async function removePeriod(userId: string, dayParam: string): Promise<void> {
  if (!isValidDay(dayParam)) throw badRequest("Day must be YYYY-MM-DD");
  await connectDB();
  await PeriodDayModel.deleteOne({ userId: new Types.ObjectId(userId), day: dayParam });
}
