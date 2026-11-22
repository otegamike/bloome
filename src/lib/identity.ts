import "server-only";

import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import { tooManyRequests, unauthorized } from "@/lib/apiErrors";
import { authenticateMobileAccess } from "@/lib/mobileAuthService";
import { parseMobileAccessBearer } from "@/lib/mobileTokens";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  recordRateLimitHit,
  retryAfterSeconds,
} from "@/lib/rateLimit";

/** Scope required by the calendar, log, pack, and profile data routes. */
export { MOBILE_DATA_SCOPE as DATA_SCOPE } from "@/lib/mobileTokens";

/**
 * One resolver for every data route that must accept both a web session and a
 * linked phone. A bearer token is only ever read from the Authorization
 * header. If one is present but unusable, the request is rejected rather than
 * silently falling back to a cookie session.
 */

export type IdentitySource = "session" | "mobile";

export interface RequestIdentity {
  userId: string;
  source: IdentitySource;
  scopes: string[];
  deviceId?: string;
}

const MOBILE_AUTH_FAILURE_LIMIT = 30;
const MOBILE_AUTH_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const BEARER_CHALLENGE = { "WWW-Authenticate": "Bearer" };

export async function requireIdentity(
  req: Request,
  options: { scope?: string } = {}
): Promise<RequestIdentity> {
  if (req.headers.has("authorization")) {
    return requireMobileIdentity(req, options.scope);
  }
  const session = await auth();
  if (!session?.userId || !Types.ObjectId.isValid(session.userId)) {
    throw unauthorized();
  }
  return { userId: session.userId, source: "session", scopes: ["*"] };
}

async function requireMobileIdentity(
  req: Request,
  scope: string | undefined
): Promise<RequestIdentity> {
  const failureKey = rateLimitKey(["mobile-access-auth", clientIp(req)]);
  if (await isRateLimited(failureKey, MOBILE_AUTH_FAILURE_LIMIT)) {
    throw tooManyRequests(await retryAfterSeconds(failureKey));
  }

  const token = parseMobileAccessBearer(req.headers.get("authorization"));
  const identity = token ? await authenticateMobileAccess(token) : null;
  if (!identity || (scope !== undefined && !identity.scopes.includes(scope))) {
    await recordRateLimitHit(failureKey, MOBILE_AUTH_FAILURE_WINDOW_MS);
    throw unauthorized("Please sign in again", BEARER_CHALLENGE);
  }

  return {
    userId: identity.userId,
    source: "mobile",
    scopes: identity.scopes,
    deviceId: identity.deviceId,
  };
}
