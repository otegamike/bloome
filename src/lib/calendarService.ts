import "server-only";

import { Types } from "mongoose";

import { badRequest, notFound } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import PillLogModel from "@/models/PillLog";
import PillPackModel from "@/models/PillPack";
import UserModel from "@/models/User";
import { buildDays } from "@/lib/shared/cycle";
import { isValidMonth, monthDays, todayInTz } from "@/lib/shared/dates";
import { toPackLike } from "@/lib/packService";
import { getPeriodDays } from "@/lib/periodService";
import type { CalendarResponse, LogLike } from "@/types/api";

void PillLogModel;
void PillPackModel;
void UserModel;

export async function getMonth(userId: string, monthParam: string): Promise<CalendarResponse> {
  const [response] = await getMonths(userId, [monthParam]);
  if (!response) throw badRequest("month must be YYYY-MM");
  return response;
}

/**
 * Load several months at once. One user, pack, log and period query covers the
 * whole span, so a 5-month window costs the same round-trips as a single month.
 */
export async function getMonths(
  userId: string,
  monthsParam: string[],
): Promise<CalendarResponse[]> {
  const months = Array.from(new Set(monthsParam));
  if (months.length === 0) {
    throw badRequest("At least one month is required");
  }
  for (const month of months) {
    if (!isValidMonth(month)) {
      throw badRequest("month must be YYYY-MM");
    }
  }
  await connectDB();
  const id = new Types.ObjectId(userId);
  const user = await UserModel.findById(id).select("timezone").lean();
  if (!user) throw notFound("Account not found");
  const timezone = user.timezone;
  const today = todayInTz(timezone);
  const packs = await PillPackModel.find({ userId: id });
  const likes = packs.map(toPackLike);

  const ranges = months.map((month) => {
    const days = monthDays(month);
    const first = days[0];
    const last = days[days.length - 1];
    if (!first || !last) throw badRequest("month must be YYYY-MM");
    return { month, days, first, last };
  });
  const first = ranges.reduce((min, r) => (r.first < min ? r.first : min), ranges[0]!.first);
  const last = ranges.reduce((max, r) => (r.last > max ? r.last : max), ranges[0]!.last);

  const logs = await PillLogModel.find({ userId: id, day: { $gte: first, $lte: last } });
  const byDay: Record<string, LogLike | undefined> = {};
  for (const doc of logs) {
    byDay[doc.day] = {
      status: doc.status,
      note: doc.note ?? null,
      takenAt: doc.takenAt.toISOString(),
      loggedLate: doc.loggedLate,
    };
  }
  const periodDays = await getPeriodDays(id, first, last);
  return ranges.map(({ month, days }) => ({
    month,
    today,
    timezone,
    days: buildDays({ packs: likes, logs: byDay, days, today, periodDays }),
  }));
}
