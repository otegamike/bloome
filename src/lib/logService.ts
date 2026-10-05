import "server-only";

import { Types } from "mongoose";

import { badRequest, notFound, unprocessable } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import PillLogModel, { type PillLogDoc } from "@/models/PillLog";
import PillPackModel from "@/models/PillPack";
import UserModel from "@/models/User";
import { compareDays, diffInDays, isValidDay, todayInTz } from "@/lib/shared/dates";
import { buildDays, getDayKind, resolveAnchor } from "@/lib/shared/cycle";
import { toPackLike } from "@/lib/packService";
import type { LogUpsertInput } from "@/lib/shared/schemas";
import type { DayString } from "@/types";
import type { CalendarDay, LogDTO, LogLike } from "@/types/api";

void PillLogModel;
void PillPackModel;
void UserModel;

function toLogDTO(doc: PillLogDoc): LogDTO {
  return {
    day: doc.day,
    status: doc.status,
    note: doc.note ?? null,
    takenAt: doc.takenAt.toISOString(),
    loggedLate: doc.loggedLate,
  };
}

function toLogLike(doc: PillLogDoc): LogLike {
  return {
    status: doc.status,
    note: doc.note ?? null,
    takenAt: doc.takenAt.toISOString(),
    loggedLate: doc.loggedLate,
  };
}

function checkDayParam(day: string): asserts day is DayString {
  if (!isValidDay(day)) {
    throw badRequest("Day must be YYYY-MM-DD");
  }
}

async function userTimezone(userId: Types.ObjectId): Promise<string> {
  const user = await UserModel.findById(userId).select("timezone").lean();
  if (!user) throw notFound("Account not found");
  return user.timezone;
}

/**
 * Log (or re-log) one day. Only active days, only today or the past.
 * Catch-up logging sets loggedLate.
 */
export async function upsertLog(
  userId: string,
  dayParam: string,
  input: LogUpsertInput,
): Promise<CalendarDay> {
  checkDayParam(dayParam);
  const day = dayParam;
  await connectDB();
  const id = new Types.ObjectId(userId);
  const timezone = await userTimezone(id);
  const today = todayInTz(timezone);
  if (compareDays(day, today) > 0) {
    throw unprocessable("Cannot log a future day");
  }
  const packs = await PillPackModel.find({ userId: id });
  const likes = packs.map(toPackLike);
  const anchor = resolveAnchor(likes, day);
  const kind = anchor
    ? getDayKind(anchor.startDay, anchor.activeDays, anchor.placeboDays, day)
    : "outside";
  if (kind === "placebo") {
    throw unprocessable("Placebo days are rest days and cannot be logged");
  }
  if (kind === "outside") {
    throw unprocessable("Days before your first pack cannot be logged");
  }
  const note = input.note?.trim() ? input.note.trim() : null;
  const loggedLate = compareDays(day, today) < 0;
  const doc = await PillLogModel.findOneAndUpdate(
    { userId: id, day },
    { $set: { status: input.status, note, takenAt: new Date(), loggedLate } },
    { upsert: true, new: true },
  );
  if (!doc) throw badRequest("Could not save this day");
  const built = buildDays({
    packs: likes,
    logs: { [day]: toLogLike(doc) },
    days: [day],
    today,
  });
  const first = built[0];
  if (!first) throw badRequest("Could not save this day");
  return first;
}

/** Idempotent: always succeeds, even when nothing was stored. */
export async function deleteLog(userId: string, dayParam: string): Promise<void> {
  checkDayParam(dayParam);
  await connectDB();
  await PillLogModel.deleteOne({ userId: new Types.ObjectId(userId), day: dayParam });
}

export async function listLogs(
  userId: string,
  fromParam: string,
  toParam: string,
): Promise<LogDTO[]> {
  if (!isValidDay(fromParam) || !isValidDay(toParam)) {
    throw badRequest("from and to must be YYYY-MM-DD");
  }
  if (compareDays(fromParam, toParam) > 0) {
    throw badRequest("from must not be after to");
  }
  if (diffInDays(fromParam, toParam) > 366) {
    throw badRequest("Range must be 366 days or fewer");
  }
  await connectDB();
  const docs = await PillLogModel.find({
    userId: new Types.ObjectId(userId),
    day: { $gte: fromParam, $lte: toParam },
  }).sort({ day: 1 });
  return docs.map(toLogDTO);
}
