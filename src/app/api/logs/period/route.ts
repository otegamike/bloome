import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { DATA_SCOPE, requireIdentity } from "@/lib/identity";
import { startPeriod } from "@/lib/periodService";
import { parseJsonBody } from "@/lib/requestParsing";
import { periodStartSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await requireIdentity(req, { scope: DATA_SCOPE });
    const { day } = await parseJsonBody(req, periodStartSchema);
    const days = await startPeriod(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}
