import { NextResponse } from "next/server";

import { badRequest, handleRouteError } from "@/lib/apiErrors";
import { getMonth, getMonths } from "@/lib/calendarService";
import { parseSearchParams } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { calendarQuerySchema } from "@/lib/shared/schemas";
import { monthsInRange } from "@/lib/shared/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { month, from, to } = parseSearchParams(new URL(req.url), calendarQuerySchema);
    if (month) {
      return NextResponse.json(await getMonth(userId, month));
    }
    if (from && to) {
      return NextResponse.json({ months: await getMonths(userId, monthsInRange(from, to)) });
    }
    throw badRequest("Provide month, or from and to");
  } catch (error) {
    return handleRouteError(error);
  }
}
