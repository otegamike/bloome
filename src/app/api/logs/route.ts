import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { listLogs } from "@/lib/logs/logService";
import { parseSearchParams } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { rangeQuerySchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { from, to } = parseSearchParams(new URL(req.url), rangeQuerySchema);
    const logs = await listLogs(userId, from, to);
    return NextResponse.json({ logs });
  } catch (error) {
    return handleRouteError(error);
  }
}
