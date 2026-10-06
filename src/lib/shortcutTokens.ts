import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Token format and parsing for the Shortcuts status endpoint. Secrets look
 * like `bsc_<43 base64url chars>` so leaked tokens are recognizable in
 * secret scanners. SHA-256 is correct here because the secret carries 256
 * bits of entropy; bcrypt is for (low-entropy) passwords, not this.
 */
export const SHORTCUT_TOKEN_PREFIX = "bsc_";
export const SHORTCUT_TOKEN_SECRET_PATTERN = /^bsc_[A-Za-z0-9_-]{43}$/;

export function generateShortcutSecret(): string {
  return `${SHORTCUT_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashShortcutSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function lastFourOfSecret(secret: string): string {
  return secret.slice(-4);
}

/**
 * Extract a well-formed token from an `Authorization` header. Returns null
 * for anything missing, malformed, or wrongly prefixed — before any database
 * lookup — so callers can answer every failure identically.
 */
export function parseShortcutBearer(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  if (!SHORTCUT_TOKEN_SECRET_PATTERN.test(token)) return null;
  return token;
}
