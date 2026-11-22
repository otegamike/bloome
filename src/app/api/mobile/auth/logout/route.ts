import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { logoutMobileDevice } from "@/lib/mobileAuthService";
import { parseJsonBody } from "@/lib/requestParsing";
import { mobileLogoutSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public and idempotent: the refresh token is the only credential needed. */
export async function POST(req: Request) {
  try {
    const { refreshToken } = await parseJsonBody(req, mobileLogoutSchema);
    await logoutMobileDevice(refreshToken);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
