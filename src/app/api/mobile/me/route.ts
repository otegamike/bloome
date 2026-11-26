import { NextResponse } from "next/server";

import { getMe } from "@/lib/account/userService";
import { handleRouteError } from "@/lib/apiErrors";
import { MOBILE_DATA_SCOPE, requireMobileIdentity } from "@/lib/mobile/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireMobileIdentity(req, MOBILE_DATA_SCOPE);
    return NextResponse.json(await getMe(userId));
  } catch (error) {
    return handleRouteError(error);
  }
}
