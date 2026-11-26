import "server-only";

import { tooManyRequests, unauthorized } from "@/lib/apiErrors";
import { authenticateMobileAccess } from "@/lib/mobile/authService";
import { MOBILE_DATA_SCOPE, parseMobileAccessBearer } from "@/lib/mobile/tokens";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  recordRateLimitHit,
  retryAfterSeconds,
} from "@/lib/rateLimit";
import type { MobileAccessIdentity } from "@/types/MobileAuth";

export { MOBILE_DATA_SCOPE };

const MOBILE_AUTH_FAILURE_LIMIT = 30;
const MOBILE_AUTH_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const BEARER_CHALLENGE = { "WWW-Authenticate": "Bearer" };

export async function requireMobileIdentity(
  req: Request,
  scope: string
): Promise<MobileAccessIdentity> {
  const failureKey = rateLimitKey(["mobile-access-auth", clientIp(req)]);
  if (await isRateLimited(failureKey, MOBILE_AUTH_FAILURE_LIMIT)) {
    throw tooManyRequests(await retryAfterSeconds(failureKey));
  }

  const token = parseMobileAccessBearer(req.headers.get("authorization"));
  const identity = token ? await authenticateMobileAccess(token) : null;
  if (!identity || !identity.scopes.includes(scope)) {
    await recordRateLimitHit(failureKey, MOBILE_AUTH_FAILURE_WINDOW_MS);
    throw unauthorized("Please sign in again", BEARER_CHALLENGE);
  }

  return identity;
}
