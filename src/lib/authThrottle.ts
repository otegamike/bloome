import "server-only";

import { createHash } from "node:crypto";

import AuthAttemptModel from "@/models/AuthAttempt";

void AuthAttemptModel;

const CREDENTIAL_LIMIT = 5;
const CREDENTIAL_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashKey(parts: string[]): string {
  return createHash("sha256").update(parts.join(":")).digest("hex");
}

async function isOver(key: string, limit: number): Promise<boolean> {
  const rec = await AuthAttemptModel.findOne({ key }).lean();
  if (!rec || rec.count < limit) return false;
  return rec.expiresAt.getTime() > Date.now();
}

async function record(key: string, windowMs: number): Promise<void> {
  const now = Date.now();
  const existing = await AuthAttemptModel.findOne({ key });
  if (existing && existing.expiresAt.getTime() > now) {
    existing.count += 1;
    await existing.save();
    return;
  }
  await AuthAttemptModel.create({ key, count: 1, expiresAt: new Date(now + windowMs) });
}

async function clear(key: string): Promise<void> {
  await AuthAttemptModel.deleteOne({ key });
}

/** Login throttle: 5 failed attempts per email+IP within 15 minutes. */
export function credentialKey(email: string, ip: string): string {
  return hashKey(["login", email.toLowerCase().trim(), ip]);
}

export async function isCredentialThrottled(email: string, ip: string): Promise<boolean> {
  return isOver(credentialKey(email, ip), CREDENTIAL_LIMIT);
}

export async function recordCredentialFailure(email: string, ip: string): Promise<void> {
  await record(credentialKey(email, ip), CREDENTIAL_WINDOW_MS);
}

export async function clearCredentialFailures(email: string, ip: string): Promise<void> {
  await clear(credentialKey(email, ip));
}

/** Register throttle: 10 attempts per IP per hour. */
export function registerKey(ip: string): string {
  return hashKey(["register", ip]);
}

export async function isRegisterThrottled(ip: string): Promise<boolean> {
  return isOver(registerKey(ip), REGISTER_LIMIT);
}

export async function recordRegisterAttempt(ip: string): Promise<void> {
  await record(registerKey(ip), REGISTER_WINDOW_MS);
}
