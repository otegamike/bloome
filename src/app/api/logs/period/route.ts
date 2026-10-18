import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { startPeriod } from "@/lib/periodService";
import { parseJsonBody } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { periodStartSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { day } = await parseJsonBody(req, periodStartSchema);
    const days = await startPeriod(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}
