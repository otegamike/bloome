import { NextResponse } from "next/server";

import { handleRouteError, tooManyRequests } from "@/lib/apiErrors";
import { assertSameOrigin } from "@/lib/origin";
import { parseJsonBody } from "@/lib/requestParsing";
import { isRateLimited, recordRateLimitHit, retryAfterSeconds } from "@/lib/rateLimit";
import { requireUserId } from "@/lib/session";
import { createShortcutTokenSchema } from "@/lib/shared/schemas";
import {
  SHORTCUT_CREATE_LIMIT,
  SHORTCUT_CREATE_WINDOW_MS,
  shortcutCreateKey,
} from "@/lib/shortcutAuth";
import { createShortcutToken, listShortcutTokens } from "@/lib/shortcutTokenService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json(await listShortcutTokens(userId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    assertSameOrigin(req);
    const createKey = shortcutCreateKey(userId);
    if (await isRateLimited(createKey, SHORTCUT_CREATE_LIMIT)) {
      throw tooManyRequests(await retryAfterSeconds(createKey));
    }
    const input = await parseJsonBody(req, createShortcutTokenSchema);
    const result = await createShortcutToken(userId, input);
    await recordRateLimitHit(createKey, SHORTCUT_CREATE_WINDOW_MS);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
