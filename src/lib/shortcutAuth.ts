import "server-only";

import { badRequest, tooManyRequests, unauthorized } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import ShortcutTokenModel from "@/models/ShortcutToken";
import { hashShortcutSecret, parseShortcutBearer } from "@/lib/shortcutTokens";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  recordRateLimitHit,
  retryAfterSeconds,
} from "@/lib/rateLimit";

void ShortcutTokenModel;

/** 20 failed authentications per 15 minutes per client IP. */
export const SHORTCUT_AUTH_LIMIT = 20;
export const SHORTCUT_AUTH_WINDOW_MS = 15 * 60 * 1000;
/** 120 successful status calls per hour per token. */
export const SHORTCUT_STATUS_LIMIT = 120;
export const SHORTCUT_STATUS_WINDOW_MS = 60 * 60 * 1000;
/** 10 token creations per day per user. */
export const SHORTCUT_CREATE_LIMIT = 10;
export const SHORTCUT_CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Avoid a write on every call: refresh lastUsedAt at most once per hour. */
const LAST_USED_UPDATE_MS = 60 * 60 * 1000;

const AUTH_FAILURE_HEADERS = { "WWW-Authenticate": "Bearer" };

export interface ShortcutAuth {
  userId: string;
  tokenId: string;
}

export function shortcutAuthKey(ip: string): string {
  return rateLimitKey(["shortcut-auth", ip]);
}

export function shortcutStatusKey(tokenId: string): string {
  return rateLimitKey(["shortcut-status", tokenId]);
}

export function shortcutCreateKey(userId: string): string {
  return rateLimitKey(["shortcut-create", userId]);
}

function requireHttps(req: Request): void {
  if (process.env.NODE_ENV !== "production") return;
  const proto = req.headers.get("x-forwarded-proto");
  if (proto && proto.split(",")[0]?.trim() !== "https") {
    throw badRequest("Use HTTPS");
  }
}

/**
 * Bearer-token gate for the Shortcuts status endpoint. Every failure —
 * missing, malformed, unknown, revoked, or expired token — answers with the
 * identical 401, so callers can never learn whether a token ever existed.
 * Never logs token values or the Authorization header.
 */
export async function authenticateShortcutRequest(req: Request): Promise<ShortcutAuth> {
  const url = new URL(req.url);
  if (url.searchParams.has("token")) {
    throw badRequest("Send the token in the Authorization header");
  }
  requireHttps(req);
  const key = shortcutAuthKey(clientIp(req));
  if (await isRateLimited(key, SHORTCUT_AUTH_LIMIT)) {
    throw tooManyRequests(await retryAfterSeconds(key));
  }
  const secret = parseShortcutBearer(req.headers.get("authorization"));
  if (!secret) {
    await recordRateLimitHit(key, SHORTCUT_AUTH_WINDOW_MS);
    throw unauthorized("Unauthorized", AUTH_FAILURE_HEADERS);
  }
  await connectDB();
  const doc = await ShortcutTokenModel.findOne({
    tokenHash: hashShortcutSecret(secret),
  }).select("+tokenHash");
  const now = new Date();
  const valid =
    doc !== null &&
    doc.revokedAt === null &&
    (doc.expiresAt === null || doc.expiresAt.getTime() > now.getTime()) &&
    doc.scopes.includes("status:read");
  if (!valid) {
    await recordRateLimitHit(key, SHORTCUT_AUTH_WINDOW_MS);
    throw unauthorized("Unauthorized", AUTH_FAILURE_HEADERS);
  }
  if (!doc.lastUsedAt || now.getTime() - doc.lastUsedAt.getTime() >= LAST_USED_UPDATE_MS) {
    doc.lastUsedAt = now;
    await doc.save();
  }
  return { userId: doc.userId.toString(), tokenId: doc._id.toString() };
}
