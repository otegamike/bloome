import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { startPeriod } from "@/lib/logs/periodService";
import { MOBILE_DATA_SCOPE, requireMobileIdentity } from "@/lib/mobile/identity";
import { parseJsonBody } from "@/lib/requestParsing";
import { periodStartSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await requireMobileIdentity(req, MOBILE_DATA_SCOPE);
    const { day } = await parseJsonBody(req, periodStartSchema);
    const days = await startPeriod(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}
