import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { markPeriodDay, removePeriod } from "@/lib/logs/periodService";
import { MOBILE_DATA_SCOPE, requireMobileIdentity } from "@/lib/mobile/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const { userId } = await requireMobileIdentity(req, MOBILE_DATA_SCOPE);
    const { day } = await params;
    const days = await markPeriodDay(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const { userId } = await requireMobileIdentity(req, MOBILE_DATA_SCOPE);
    const { day } = await params;
    const days = await removePeriod(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}
