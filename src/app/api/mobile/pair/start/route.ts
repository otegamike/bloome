import { NextResponse } from "next/server";

import { handleRouteError, tooManyRequests } from "@/lib/apiErrors";
import { getEnv } from "@/lib/env";
import { startPairing } from "@/lib/mobilePairingService";
import { MOBILE_PAIR_START_LIMIT, mobileLimitKey } from "@/lib/mobileRateLimit";
import { parseJsonBody } from "@/lib/requestParsing";
import {
  clientIp,
  isRateLimited,
  recordRateLimitHit,
  retryAfterSeconds,
} from "@/lib/rateLimit";
import { mobilePairStartSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: the phone creates a pairing request and opens the returned URL. */
export async function POST(req: Request) {
  try {
    const key = mobileLimitKey("pair-start", clientIp(req));
    if (await isRateLimited(key, MOBILE_PAIR_START_LIMIT.limit)) {
      throw tooManyRequests(await retryAfterSeconds(key));
    }
    const input = await parseJsonBody(req, mobilePairStartSchema);
    const baseUrl = getEnv().AUTH_URL.replace(/\/+$/, "");
    const result = await startPairing(input, baseUrl);
    await recordRateLimitHit(key, MOBILE_PAIR_START_LIMIT.windowMs);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
