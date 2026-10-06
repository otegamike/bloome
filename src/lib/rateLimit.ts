import "server-only";

import { createHash } from "node:crypto";

import AuthAttemptModel from "@/models/AuthAttempt";

void AuthAttemptModel;

// Shared Mongo-backed throttle (TTL index on AuthAttempt.expiresAt).
// Callers build a hashed key, check `isRateLimited` before doing work, and
// call `recordRateLimitHit` when the event being limited actually happens.

/** Best-effort client IP from proxy headers (first x-forwarded-for value). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Hash key parts so raw emails and IPs never sit in the database. */
export function rateLimitKey(parts: string[]): string {
  return createHash("sha256").update(parts.join(":")).digest("hex");
}

export async function isRateLimited(key: string, limit: number): Promise<boolean> {
  const rec = await AuthAttemptModel.findOne({ key }).lean();
  if (!rec || rec.count < limit) return false;
  return rec.expiresAt.getTime() > Date.now();
}

/** Seconds until the current window resets (for Retry-After headers). */
export async function retryAfterSeconds(key: string): Promise<number> {
  const rec = await AuthAttemptModel.findOne({ key }).lean();
  if (!rec) return 0;
  return Math.max(0, Math.ceil((rec.expiresAt.getTime() - Date.now()) / 1000));
}

export async function recordRateLimitHit(key: string, windowMs: number): Promise<void> {
  const now = Date.now();
  const existing = await AuthAttemptModel.findOne({ key });
  if (existing && existing.expiresAt.getTime() > now) {
    existing.count += 1;
    await existing.save();
    return;
  }
  await AuthAttemptModel.create({ key, count: 1, expiresAt: new Date(now + windowMs) });
}

export async function clearRateLimit(key: string): Promise<void> {
  await AuthAttemptModel.deleteOne({ key });
}
