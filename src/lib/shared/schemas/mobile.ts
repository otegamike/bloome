import { z } from "zod";

/**
 * Base64url-encoded SHA-256 digest of the PKCE verifier. SHA-256 output is
 * 32 bytes, which encodes to exactly 43 base64url characters without padding.
 */
export const pkceChallengeSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid PKCE challenge");

/** RFC 7636 verifier: 43–128 chars from the unreserved set. */
export const pkceVerifierSchema = z
  .string()
  .min(43, "Invalid PKCE verifier")
  .max(128, "Invalid PKCE verifier")
  .regex(/^[A-Za-z0-9._~-]+$/, "Invalid PKCE verifier");

export const pairingIdSchema = z
  .string()
  .regex(/^bpi_[A-Za-z0-9_-]{43}$/, "Invalid pairing request");

const deviceNameSchema = z.string().trim().min(1).max(60).nullish();

export const mobilePairStartSchema = z.object({
  challenge: pkceChallengeSchema,
  challengeMethod: z.literal("S256"),
  deviceName: deviceNameSchema,
});

export const mobilePairApproveSchema = z.object({
  pairingId: pairingIdSchema,
});

export const mobilePairRevokeSchema = mobilePairApproveSchema;

/**
 * The user types the code from the web page into the phone. Accept the
 * displayed "XXXXX-XXXXX" form (and any spacing/lowercase) by normalizing to
 * ten characters before validating.
 */
export const pairingCodeSchema = z
  .string()
  .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .pipe(z.string().length(10, "Enter the 10-character code"));

export const mobilePairRedeemSchema = z.object({
  pairingId: pairingIdSchema,
  code: pairingCodeSchema,
  verifier: pkceVerifierSchema,
});

export const mobileRefreshSchema = z.object({
  refreshToken: z.string().regex(/^bmr_[A-Za-z0-9_-]{43}$/, "Invalid refresh token"),
});

export const mobileLogoutSchema = mobileRefreshSchema;

export type MobilePairStartInput = z.infer<typeof mobilePairStartSchema>;
export type MobilePairApproveInput = z.infer<typeof mobilePairApproveSchema>;
export type MobilePairRedeemInput = z.infer<typeof mobilePairRedeemSchema>;
export type MobileRefreshInput = z.infer<typeof mobileRefreshSchema>;
