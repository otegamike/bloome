import { NextResponse } from "next/server";
import { z } from "zod";

import { badRequest, handleRouteError } from "@/lib/apiErrors";
import { getMonth, getMonths } from "@/lib/calendarService";
import { parseSearchParams } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { monthParamSchema, monthsParamSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z
  .object({
    month: monthParamSchema.optional(),
    months: monthsParamSchema.optional(),
  })
  .refine(
    (v) => (v.month ? 1 : 0) + (v.months ? 1 : 0) === 1,
    "Provide either month or months",
  );

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { month, months } = parseSearchParams(new URL(req.url), querySchema);
    if (months) {
      return NextResponse.json({ months: await getMonths(userId, months) });
    }
    if (month) {
      return NextResponse.json(await getMonth(userId, month));
    }
    throw badRequest("Provide either month or months");
  } catch (error) {
    return handleRouteError(error);
  }
}
