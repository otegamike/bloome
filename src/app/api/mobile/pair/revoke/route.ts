import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { revokePairing } from "@/lib/mobilePairingService";
import { assertSameOrigin } from "@/lib/origin";
import { parseJsonBody } from "@/lib/requestParsing";
import { requireUserId } from "@/lib/session";
import { mobilePairRevokeSchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Web session only: deny or cancel a pending link request. Idempotent. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    assertSameOrigin(req);
    const { pairingId } = await parseJsonBody(req, mobilePairRevokeSchema);
    await revokePairing(userId, pairingId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
