import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Opaque token helpers. Nothing here is reversible: only SHA-256 hashes are
 * stored, so a database leak never exposes a usable token.
 */

export const MOBILE_DATA_SCOPE = "data";

export const ACCESS_TOKEN_PREFIX = "bma_";
export const REFRESH_TOKEN_PREFIX = "bmr_";
export const PAIRING_ID_PREFIX = "bpi_";
export const FAMILY_ID_PREFIX = "bmf_";

export const ACCESS_TOKEN_PATTERN = /^bma_[A-Za-z0-9_-]{43}$/;
export const REFRESH_TOKEN_PATTERN = /^bmr_[A-Za-z0-9_-]{43}$/;

export const MOBILE_ACCESS_TTL_MS = 15 * 60 * 1000;
export const MOBILE_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Crockford-style alphabet: no 0/O or 1/I/L, so the code is easy to retype. */
const PAIRING_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PAIRING_CODE_LENGTH = 10;

function randomToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString("base64url")}`;
}

export function generateAccessToken(): string {
  return randomToken(ACCESS_TOKEN_PREFIX);
}

export function generateRefreshToken(): string {
  return randomToken(REFRESH_TOKEN_PREFIX);
}

export function generatePairingId(): string {
  return randomToken(PAIRING_ID_PREFIX);
}

export function generateFamilyId(): string {
  return randomToken(FAMILY_ID_PREFIX);
}

export function hashMobileToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePairingCode(): string {
  const bytes = randomBytes(PAIRING_CODE_LENGTH);
  let code = "";
  for (const byte of bytes) {
    code += PAIRING_CODE_ALPHABET.charAt(byte % PAIRING_CODE_ALPHABET.length);
  }
  return code;
}

export function normalizePairingCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatPairingCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function hashPairingCode(input: string): string {
  return createHash("sha256").update(normalizePairingCode(input)).digest("hex");
}

/** S256 PKCE challenge: base64url(SHA-256(verifier)). */
export function computePkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** Extracts a well-formed mobile access token from an Authorization header. */
export function parseMobileAccessBearer(header: string | null): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed.startsWith("Bearer ")) return null;
  const token = trimmed.slice("Bearer ".length).trim();
  return ACCESS_TOKEN_PATTERN.test(token) ? token : null;
}
