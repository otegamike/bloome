import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { DATA_SCOPE, requireIdentity } from "@/lib/identity";
import { markPeriodDay, removePeriod } from "@/lib/periodService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const { userId } = await requireIdentity(req, { scope: DATA_SCOPE });
    const { day } = await params;
    const days = await markPeriodDay(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const { userId } = await requireIdentity(req, { scope: DATA_SCOPE });
    const { day } = await params;
    const days = await removePeriod(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}
