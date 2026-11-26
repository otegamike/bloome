import { NextResponse } from "next/server";

import { handleRouteError, tooManyRequests } from "@/lib/apiErrors";
import { approvePairing } from "@/lib/mobile/pairingService";
import { MOBILE_PAIR_APPROVE_LIMIT, mobileLimitKey } from "@/lib/mobile/rateLimit";
import { assertSameOrigin } from "@/lib/origin";
import { parseJsonBody } from "@/lib/requestParsing";
import { isRateLimited, recordRateLimitHit, retryAfterSeconds } from "@/lib/rateLimit";
import { requireUserId } from "@/lib/session";
import { mobilePairApproveSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Web session only: the browser approves the phone and gets a one-time code. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    assertSameOrigin(req);
    const key = mobileLimitKey("pair-approve", userId);
    if (await isRateLimited(key, MOBILE_PAIR_APPROVE_LIMIT.limit)) {
      throw tooManyRequests(await retryAfterSeconds(key));
    }
    const { pairingId } = await parseJsonBody(req, mobilePairApproveSchema);
    const result = await approvePairing(userId, pairingId);
    await recordRateLimitHit(key, MOBILE_PAIR_APPROVE_LIMIT.windowMs);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
