import { describe, expect, it } from "vitest";

import {
  mobilePairApproveSchema,
  mobilePairRedeemSchema,
  mobilePairStartSchema,
  mobileRefreshSchema,
  pairingCodeSchema,
  pairingIdSchema,
} from "@/lib/shared/schemas";

const PAIRING_ID = `bpi_${"a".repeat(43)}`;
const CHALLENGE = "b".repeat(43);
const REFRESH_TOKEN = `bmr_${"c".repeat(43)}`;
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

describe("mobilePairStartSchema", () => {
  it("accepts an S256 challenge with an optional device name", () => {
    const result = mobilePairStartSchema.parse({
      challenge: CHALLENGE,
      challengeMethod: "S256",
      deviceName: "  My iPhone  ",
    });
    expect(result.deviceName).toBe("My iPhone");
  });

  it("accepts a missing or null device name", () => {
    expect(
      mobilePairStartSchema.parse({ challenge: CHALLENGE, challengeMethod: "S256" }).deviceName
    ).toBeUndefined();
    expect(
      mobilePairStartSchema.parse({
        challenge: CHALLENGE,
        challengeMethod: "S256",
        deviceName: null,
      }).deviceName
    ).toBeNull();
  });

  it("rejects plain PKCE and malformed challenges", () => {
    expect(
      mobilePairStartSchema.safeParse({ challenge: CHALLENGE, challengeMethod: "plain" }).success
    ).toBe(false);
    expect(
      mobilePairStartSchema.safeParse({ challenge: "short", challengeMethod: "S256" }).success
    ).toBe(false);
  });
});

describe("pairingIdSchema", () => {
  it("accepts the format the server mints", () => {
    expect(pairingIdSchema.safeParse(PAIRING_ID).success).toBe(true);
  });

  it("rejects anything else", () => {
    expect(pairingIdSchema.safeParse("bpi_short").success).toBe(false);
    expect(pairingIdSchema.safeParse(`bpi_${"a".repeat(44)}`).success).toBe(false);
  });
});

describe("pairingCodeSchema", () => {
  it("strips spaces and dashes before checking ten characters", () => {
    expect(pairingCodeSchema.parse("abcde-fghjk")).toBe("ABCDEFGHJK");
    expect(pairingCodeSchema.parse("ABCDE FGHJK")).toBe("ABCDEFGHJK");
  });

  it("rejects the wrong length", () => {
    expect(pairingCodeSchema.safeParse("ABCDE-FGHJ").success).toBe(false);
    expect(pairingCodeSchema.safeParse("ABCDE-FGHJKL").success).toBe(false);
  });
});

describe("mobilePairRedeemSchema", () => {
  it("accepts a complete exchange", () => {
    const result = mobilePairRedeemSchema.parse({
      pairingId: PAIRING_ID,
      code: "abcde-fghjk",
      verifier: VERIFIER,
    });
    expect(result.code).toBe("ABCDEFGHJK");
  });

  it("rejects verifiers outside the RFC 7636 character set", () => {
    expect(
      mobilePairRedeemSchema.safeParse({
        pairingId: PAIRING_ID,
        code: "ABCDE-FGHJK",
        verifier: `${"a".repeat(42)}+`,
      }).success
    ).toBe(false);
  });
});

describe("mobilePairApproveSchema", () => {
  it("requires a valid pairing id", () => {
    expect(mobilePairApproveSchema.safeParse({ pairingId: PAIRING_ID }).success).toBe(true);
    expect(mobilePairApproveSchema.safeParse({ pairingId: "nope" }).success).toBe(false);
  });
});

describe("mobileRefreshSchema", () => {
  it("accepts only a refresh token", () => {
    expect(mobileRefreshSchema.safeParse({ refreshToken: REFRESH_TOKEN }).success).toBe(true);
    expect(
      mobileRefreshSchema.safeParse({ refreshToken: REFRESH_TOKEN.replace("bmr_", "bma_") }).success
    ).toBe(false);
  });
});
