import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { markPeriodDay, removePeriod } from "@/lib/periodService";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const userId = await requireUserId();
    const { day } = await params;
    const days = await markPeriodDay(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const userId = await requireUserId();
    const { day } = await params;
    const days = await removePeriod(userId, day);
    return NextResponse.json({ days });
  } catch (error) {
    return handleRouteError(error);
  }
}
