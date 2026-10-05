import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { sendTestNotification } from "@/lib/pushService";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { sent } = await sendTestNotification(await requireUserId());
    return NextResponse.json({ sent });
  } catch (error) {
    return handleRouteError(error);
  }
}
