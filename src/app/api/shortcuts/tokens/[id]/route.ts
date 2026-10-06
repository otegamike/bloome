import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/apiErrors";
import { assertSameOrigin } from "@/lib/origin";
import { requireUserId } from "@/lib/session";
import { revokeShortcutToken } from "@/lib/shortcutTokenService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Revoke a token. Idempotent: unknown ids still answer 204. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    assertSameOrigin(req);
    const { id } = await params;
    await revokeShortcutToken(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
