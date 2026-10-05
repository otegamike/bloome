import { NextResponse } from "next/server";
import { z } from "zod";

import { handleRouteError } from "@/lib/apiErrors";
import { getMonth } from "@/lib/calendarService";
import { parseSearchParams } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { monthParamSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ month: monthParamSchema });

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { month } = parseSearchParams(new URL(req.url), querySchema);
    return NextResponse.json(await getMonth(userId, month));
  } catch (error) {
    return handleRouteError(error);
  }
}
