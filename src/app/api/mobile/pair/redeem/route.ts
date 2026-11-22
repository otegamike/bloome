import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { redeemPairing } from "@/lib/mobileAuthService";
import { MOBILE_PAIR_REDEEM_LIMIT, runLimitedAttempt } from "@/lib/mobileRateLimit";
import { parseJsonBody } from "@/lib/requestParsing";
import { clientIp } from "@/lib/rateLimit";
import { mobilePairRedeemSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: exchange the browser-approved code plus PKCE verifier for tokens. */
export async function POST(req: Request) {
  try {
    const tokens = await runLimitedAttempt(
      "pair-redeem",
      clientIp(req),
      MOBILE_PAIR_REDEEM_LIMIT,
      async () => {
        const input = await parseJsonBody(req, mobilePairRedeemSchema);
        return redeemPairing(input);
      }
    );
    return NextResponse.json(tokens);
  } catch (error) {
    return handleRouteError(error);
  }
}
