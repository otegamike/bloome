import "server-only";

import { forbidden } from "@/lib/apiErrors";
import { getEnv } from "@/lib/env";

/**
 * CSRF-style guard for session-authenticated management routes. Browser
 * fetches always send `Origin`; when present its host must match the app's
 * own host (from AUTH_URL or the request Host header), otherwise 403.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw forbidden();
  }
  const requestHost = (req.headers.get("host") ?? "").toLowerCase();
  let appHost = "";
  try {
    appHost = new URL(getEnv().AUTH_URL).host.toLowerCase();
  } catch {
    appHost = "";
  }
  if (originHost !== appHost && originHost !== requestHost) {
    throw forbidden();
  }
}
