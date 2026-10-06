import "server-only";

import {
  clearRateLimit,
  clientIp,
  isRateLimited,
  rateLimitKey,
  recordRateLimitHit,
} from "@/lib/rateLimit";

export { clientIp };

const CREDENTIAL_LIMIT = 5;
const CREDENTIAL_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

/** Login throttle: 5 failed attempts per email+IP within 15 minutes. */
export function credentialKey(email: string, ip: string): string {
  return rateLimitKey(["login", email.toLowerCase().trim(), ip]);
}

export async function isCredentialThrottled(email: string, ip: string): Promise<boolean> {
  return isRateLimited(credentialKey(email, ip), CREDENTIAL_LIMIT);
}

export async function recordCredentialFailure(email: string, ip: string): Promise<void> {
  await recordRateLimitHit(credentialKey(email, ip), CREDENTIAL_WINDOW_MS);
}

export async function clearCredentialFailures(email: string, ip: string): Promise<void> {
  await clearRateLimit(credentialKey(email, ip));
}

/** Register throttle: 10 attempts per IP per hour. */
export function registerKey(ip: string): string {
  return rateLimitKey(["register", ip]);
}

export async function isRegisterThrottled(ip: string): Promise<boolean> {
  return isRateLimited(registerKey(ip), REGISTER_LIMIT);
}

export async function recordRegisterAttempt(ip: string): Promise<void> {
  await recordRateLimitHit(registerKey(ip), REGISTER_WINDOW_MS);
}
