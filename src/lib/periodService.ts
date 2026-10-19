import "server-only";

import { Types } from "mongoose";

import { badRequest, notFound, unprocessable } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import PeriodDayModel from "@/models/PeriodDay";
import PillLogModel from "@/models/PillLog";
import PillPackModel from "@/models/PillPack";
import UserModel from "@/models/User";
import {
  buildDays,
  getDayKind,
  periodDaysFor,
  periodRun,
  placeboIndex,
  resolveAnchor,
} from "@/lib/shared/cycle";
import { addDays, isValidDay, todayInTz } from "@/lib/shared/dates";
import { toPackLike } from "@/lib/packService";
import type { DayString } from "@/types";
import type { CalendarDay, LogLike, PackLike } from "@/types/api";

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

/** Rebuild calendar days for `days`, folding in logs and the period overlay. */
async function buildForDays(
  userId: Types.ObjectId,
  likes: PackLike[],
  today: DayString,
  days: DayString[],
  periodDays: ReadonlySet<DayString>,
): Promise<CalendarDay[]> {
  const logs = await PillLogModel.find({ userId, day: { $in: days } });
  const byDay: Record<string, LogLike | undefined> = {};
  for (const doc of logs) {
    byDay[doc.day] = {
      status: doc.status,
      note: doc.note ?? null,
      takenAt: doc.takenAt.toISOString(),
      loggedLate: doc.loggedLate,
    };
  }
  return buildDays({ packs: likes, logs: byDay, days, today, periodDays });
}

/**
 * Start a period on a placebo day. The start day plus the next three days are
 * marked as period days, clipped to the pack's placebo block. Idempotent.
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
  return buildForDays(id, likes, today, range, new Set<DayString>(range));
}

/**
 * Mark a single placebo day as a period day, so a period that runs longer than
 * the automatic four days can be extended by hand. Idempotent.
 */
export async function markPeriodDay(userId: string, dayParam: string): Promise<CalendarDay[]> {
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
  if (getDayKind(anchor.startDay, anchor.activeDays, anchor.placeboDays, day) !== "placebo") {
    throw unprocessable("A period day must fall on a placebo day");
  }
  await PeriodDayModel.updateOne(
    { userId: id, day },
    { $setOnInsert: { userId: id, day } },
    { upsert: true },
  );
  const today = todayInTz(user.timezone);
  return buildForDays(id, likes, today, [day], new Set<DayString>([day]));
}

/**
 * Remove the whole run of consecutive period days containing `day` — period
 * days are never unmarked one at a time from the middle. Idempotent.
 */
export async function removePeriod(userId: string, dayParam: string): Promise<CalendarDay[]> {
  if (!isValidDay(dayParam)) throw badRequest("Day must be YYYY-MM-DD");
  const day = dayParam;
  await connectDB();
  const id = new Types.ObjectId(userId);
  const user = await UserModel.findById(id).select("timezone").lean();
  if (!user) throw notFound("Account not found");
  const periodDays = await getPeriodDays(id, addDays(day, -14), addDays(day, 14));
  const run = periodRun(periodDays, day);
  if (run.length === 0) return [];
  await PeriodDayModel.deleteMany({ userId: id, day: { $in: run } });
  const packs = await PillPackModel.find({ userId: id });
  const likes = packs.map(toPackLike);
  const today = todayInTz(user.timezone);
  const remaining = new Set(periodDays);
  for (const removed of run) {
    remaining.delete(removed);
  }
  return buildForDays(id, likes, today, run, remaining);
}
