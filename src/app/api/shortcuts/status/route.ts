import { NextResponse } from "next/server";

import { handleRouteError, tooManyRequests } from "@/lib/apiErrors";
import {
  authenticateShortcutRequest,
  SHORTCUT_STATUS_LIMIT,
  SHORTCUT_STATUS_WINDOW_MS,
  shortcutStatusKey,
} from "@/lib/shortcutAuth";
import { parseSearchParams } from "@/lib/requestParsing";
import { isRateLimited, recordRateLimitHit, retryAfterSeconds } from "@/lib/rateLimit";
import { getShortcutStatus } from "@/lib/shortcutService";
import { shortcutStatusQuerySchema } from "@/lib/shared/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apple Shortcuts status for today. Bearer-token auth only (session cookies
 * are not accepted here); test `remind` (1 = show the notification using
 * `title`/`message`). Never sends CORS headers: Shortcuts is not a browser
 * and this must not be callable from other websites.
 */
function withHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(req: Request) {
  try {
    const { userId, tokenId } = await authenticateShortcutRequest(req);
    const statusKey = shortcutStatusKey(tokenId);
    if (await isRateLimited(statusKey, SHORTCUT_STATUS_LIMIT)) {
      throw tooManyRequests(await retryAfterSeconds(statusKey));
    }
    const { tz } = parseSearchParams(new URL(req.url), shortcutStatusQuerySchema);
    const body = await getShortcutStatus({ userId, timezone: tz });
    await recordRateLimitHit(statusKey, SHORTCUT_STATUS_WINDOW_MS);
    return withHeaders(NextResponse.json(body));
  } catch (error) {
    return withHeaders(handleRouteError(error));
  }
}

function methodNotAllowed(): NextResponse {
  return withHeaders(NextResponse.json({ error: "Method not allowed" }, { status: 405 }));
}

export async function POST(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PUT(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PATCH(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function DELETE(): Promise<NextResponse> {
  return methodNotAllowed();
}
