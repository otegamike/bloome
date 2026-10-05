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
import type { CalendarResponse, LogLike } from "@/types/api";

void PillLogModel;
void PillPackModel;
void UserModel;

export async function getMonth(userId: string, monthParam: string): Promise<CalendarResponse> {
  if (!isValidMonth(monthParam)) {
    throw badRequest("month must be YYYY-MM");
  }
  await connectDB();
  const id = new Types.ObjectId(userId);
  const user = await UserModel.findById(id).select("timezone").lean();
  if (!user) throw notFound("Account not found");
  const timezone = user.timezone;
  const today = todayInTz(timezone);
  const packs = await PillPackModel.find({ userId: id });
  const days = monthDays(monthParam);
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) throw badRequest("month must be YYYY-MM");
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
  return {
    month: monthParam,
    today,
    timezone,
    days: buildDays({ packs: packs.map(toPackLike), logs: byDay, days, today }),
  };
}
