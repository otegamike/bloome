import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { getEnv } from "@/lib/env";
import { runReminderSweep } from "@/lib/reminderService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Bearer-secret gate. Anything else gets a bare 401 with no detail. */
function checkCronSecret(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  const expected = getEnv().CRON_SECRET ?? "";
  if (!expected || scheme !== "Bearer" || !token) return false;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(req: Request) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(await runReminderSweep());
  } catch (error) {
    return handleRouteError(error);
  }
}
