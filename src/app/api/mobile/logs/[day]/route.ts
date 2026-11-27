import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { deleteLog, upsertLog } from "@/lib/logs/logService";
import { MOBILE_DATA_SCOPE, requireMobileIdentity } from "@/lib/mobile/identity";
import { parseJsonBody } from "@/lib/requestParsing";
import { logUpsertSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const { userId } = await requireMobileIdentity(req, MOBILE_DATA_SCOPE);
    const { day } = await params;
    const input = await parseJsonBody(req, logUpsertSchema);
    const result = await upsertLog(userId, day, input);
    return NextResponse.json({ day: result });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const { userId } = await requireMobileIdentity(req, MOBILE_DATA_SCOPE);
    const { day } = await params;
    await deleteLog(userId, day);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
