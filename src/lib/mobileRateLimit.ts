import "server-only";

import { tooManyRequests } from "@/lib/apiErrors";
import {
  clearRateLimit,
  isRateLimited,
  rateLimitKey,
  recordRateLimitHit,
  retryAfterSeconds,
} from "@/lib/rateLimit";

export interface LimitSpec {
  limit: number;
  windowMs: number;
}

export const MOBILE_PAIR_START_LIMIT: LimitSpec = { limit: 20, windowMs: 60 * 60 * 1000 };
export const MOBILE_PAIR_REDEEM_LIMIT: LimitSpec = { limit: 10, windowMs: 15 * 60 * 1000 };
export const MOBILE_PAIR_APPROVE_LIMIT: LimitSpec = { limit: 30, windowMs: 15 * 60 * 1000 };
export const MOBILE_REFRESH_LIMIT: LimitSpec = { limit: 60, windowMs: 15 * 60 * 1000 };

export function mobileLimitKey(name: string, subject: string): string {
  return rateLimitKey(["mobile", name, subject]);
}

/**
 * Reject a full bucket before doing work, count failures, and clear on success
 * so a legitimate client never gets stuck behind earlier typos.
 */
export async function runLimitedAttempt<T>(
  name: string,
  subject: string,
  spec: LimitSpec,
  attempt: () => Promise<T>
): Promise<T> {
  const key = mobileLimitKey(name, subject);
  if (await isRateLimited(key, spec.limit)) {
    throw tooManyRequests(await retryAfterSeconds(key));
  }
  try {
    const result = await attempt();
    await clearRateLimit(key);
    return result;
  } catch (error) {
    await recordRateLimitHit(key, spec.windowMs);
    throw error;
  }
}
