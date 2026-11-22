import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { DATA_SCOPE, requireIdentity } from "@/lib/identity";
import { listLogs } from "@/lib/logService";
import { parseSearchParams } from "@/lib/requestParsing";
import { rangeQuerySchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireIdentity(req, { scope: DATA_SCOPE });
    const { from, to } = parseSearchParams(new URL(req.url), rangeQuerySchema);
    const logs = await listLogs(userId, from, to);
    return NextResponse.json({ logs });
  } catch (error) {
    return handleRouteError(error);
  }
}
