import "server-only";

import { Types } from "mongoose";

import { notFound } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import { toPackLike } from "@/lib/packService";
import PillLogModel from "@/models/PillLog";
import PillPackModel from "@/models/PillPack";
import UserModel from "@/models/User";
import { APP_NAME } from "@/lib/shared/config";
import { getDayKind, resolveAnchor } from "@/lib/shared/cycle";
import { todayInTz } from "@/lib/shared/dates";
import { resolveOnPlaceboDays, shouldRemindToday } from "@/lib/shared/reminders";
import { pickMessage } from "@/lib/reminderMessages/pick";
import type { DayKind, DayString } from "@/types";
import type { ShortcutStatusResponse } from "@/types/api";

void PillLogModel;
void PillPackModel;
void UserModel;

export interface ShortcutStatusArgs {
  userId: string;
  /** IANA timezone override (from `?tz=`); defaults to the user's saved zone. */
  timezone?: string;
  now?: Date;
}

/**
 * Apple Shortcuts status for one local day. Uses the same shared reminder
 * decision as the push sweep (placebo days follow `reminder.onPlaceboDays`,
 * missing reads as on) and the shared rotating message picker.
 */
export async function getShortcutStatus(args: ShortcutStatusArgs): Promise<ShortcutStatusResponse> {
  const { userId, now = new Date() } = args;
  await connectDB();
  const id = new Types.ObjectId(userId);
  const user = await UserModel.findById(id).select("name timezone reminder").lean();
  if (!user) throw notFound("Account not found");
  const day: DayString = todayInTz(args.timezone ?? user.timezone ?? "UTC", now);
  const packs = await PillPackModel.find({ userId: id });
  const anchor = resolveAnchor(packs.map(toPackLike), day);
  const kind: DayKind = anchor
    ? getDayKind(anchor.startDay, anchor.activeDays, anchor.placeboDays, day)
    : "outside";
  const logged = await PillLogModel.findOne({ userId: id, day }).select("_id").lean();
  const remind = shouldRemindToday({
    kind,
    hasLog: !!logged,
    onPlaceboDays: resolveOnPlaceboDays(user.reminder?.onPlaceboDays),
  });
  const firstName = (user.name ?? "").trim().split(/\s+/)[0] ?? "";
  const message = await pickMessage({ userId, localDay: day, firstName });
  return {
    ok: true,
    date: day,
    remind: remind ? 1 : 0,
    marked: logged ? 1 : 0,
    title: APP_NAME,
    message,
  };
}
