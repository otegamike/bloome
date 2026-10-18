import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { removePeriod } from "@/lib/periodService";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const userId = await requireUserId();
    const { day } = await params;
    await removePeriod(userId, day);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
