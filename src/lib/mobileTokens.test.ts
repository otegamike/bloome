import { describe, expect, it } from "vitest";

import {
  ACCESS_TOKEN_PATTERN,
  MOBILE_ACCESS_TTL_MS,
  MOBILE_REFRESH_TTL_MS,
  REFRESH_TOKEN_PATTERN,
  computePkceChallenge,
  formatPairingCode,
  generateAccessToken,
  generateFamilyId,
  generatePairingCode,
  generatePairingId,
  generateRefreshToken,
  hashMobileToken,
  hashPairingCode,
  normalizePairingCode,
  parseMobileAccessBearer,
} from "@/lib/mobileTokens";

const PAIRING_ALPHABET = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;

describe("mobile token generation", () => {
  it("mints opaque tokens with the right prefix and shape", () => {
    const access = generateAccessToken();
    const refresh = generateRefreshToken();
    expect(ACCESS_TOKEN_PATTERN.test(access)).toBe(true);
    expect(REFRESH_TOKEN_PATTERN.test(refresh)).toBe(true);
    expect(generateAccessToken()).not.toBe(access);
    expect(generateRefreshToken()).not.toBe(refresh);
  });

  it("mints pairing and family ids", () => {
    expect(generatePairingId()).toMatch(/^bpi_[A-Za-z0-9_-]{43}$/);
    expect(generateFamilyId()).toMatch(/^bmf_[A-Za-z0-9_-]{43}$/);
  });

  it("keeps the access token much shorter-lived than the refresh token", () => {
    expect(MOBILE_ACCESS_TTL_MS).toBeLessThan(MOBILE_REFRESH_TTL_MS);
  });

  it("hashes deterministically into hex and never returns the input", () => {
    const token = generateAccessToken();
    const hash = hashMobileToken(token);
    expect(hash).toBe(hashMobileToken(token));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
  });
});

describe("pairing codes", () => {
  it("generates ten unambiguous characters", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generatePairingCode()).toMatch(PAIRING_ALPHABET);
    }
  });

  it("formats as two groups of five", () => {
    expect(formatPairingCode("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
  });

  it("normalizes what a person actually types", () => {
    expect(normalizePairingCode(" abcde-fghjk ")).toBe("ABCDEFGHJK");
    expect(normalizePairingCode("ABCDE FGHJK")).toBe("ABCDEFGHJK");
  });

  it("hashes the formatted and raw forms to the same value", () => {
    const raw = generatePairingCode();
    expect(hashPairingCode(formatPairingCode(raw))).toBe(hashPairingCode(raw));
  });
});

describe("PKCE", () => {
  it("matches the RFC 7636 S256 example", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(computePkceChallenge(verifier)).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });

  it("produces a 43-character base64url digest", () => {
    expect(computePkceChallenge("a".repeat(43))).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("parseMobileAccessBearer", () => {
  const token = generateAccessToken();

  it("reads a well-formed bearer token", () => {
    expect(parseMobileAccessBearer(`Bearer ${token}`)).toBe(token);
    expect(parseMobileAccessBearer(`  Bearer   ${token}  `)).toBe(token);
  });

  it("rejects anything that is not a mobile access token", () => {
    expect(parseMobileAccessBearer(null)).toBeNull();
    expect(parseMobileAccessBearer("")).toBeNull();
    expect(parseMobileAccessBearer(token)).toBeNull();
    expect(parseMobileAccessBearer(`Basic ${token}`)).toBeNull();
    expect(parseMobileAccessBearer("Bearer bmr_short")).toBeNull();
    expect(parseMobileAccessBearer("Bearer ")).toBeNull();
  });
});
