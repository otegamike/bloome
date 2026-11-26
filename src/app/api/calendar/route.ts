import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { getCalendar } from "@/lib/calendar/calendarService";
import { parseSearchParams } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { calendarQuerySchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const query = parseSearchParams(new URL(req.url), calendarQuerySchema);
    return NextResponse.json(await getCalendar(userId, query));
  } catch (error) {
    return handleRouteError(error);
  }
}
