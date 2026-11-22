import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { refreshMobileSession } from "@/lib/mobileAuthService";
import { MOBILE_REFRESH_LIMIT, runLimitedAttempt } from "@/lib/mobileRateLimit";
import { parseJsonBody } from "@/lib/requestParsing";
import { clientIp } from "@/lib/rateLimit";
import { mobileRefreshSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: rotate an opaque refresh token into a fresh token pair. */
export async function POST(req: Request) {
  try {
    const tokens = await runLimitedAttempt(
      "refresh",
      clientIp(req),
      MOBILE_REFRESH_LIMIT,
      async () => {
        const { refreshToken } = await parseJsonBody(req, mobileRefreshSchema);
        return refreshMobileSession(refreshToken);
      }
    );
    return NextResponse.json(tokens);
  } catch (error) {
    return handleRouteError(error);
  }
}
