import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { MOBILE_DATA_SCOPE, requireMobileIdentity } from "@/lib/mobile/identity";
import { listPacks } from "@/lib/packs/packService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireMobileIdentity(req, MOBILE_DATA_SCOPE);
    const packs = await listPacks(userId);
    return NextResponse.json({ packs });
  } catch (error) {
    return handleRouteError(error);
  }
}
