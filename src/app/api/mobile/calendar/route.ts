import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { getCalendar } from "@/lib/calendar/calendarService";
import { MOBILE_DATA_SCOPE, requireMobileIdentity } from "@/lib/mobile/identity";
import { parseSearchParams } from "@/lib/requestParsing";
import { calendarQuerySchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireMobileIdentity(req, MOBILE_DATA_SCOPE);
    const query = parseSearchParams(new URL(req.url), calendarQuerySchema);
    return NextResponse.json(await getCalendar(userId, query));
  } catch (error) {
    return handleRouteError(error);
  }
}
