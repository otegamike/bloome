/**
 * Shared mobile-auth vocabulary. These types are used by the pairing models,
 * the mobile services, the web authorize page, and the API DTOs.
 */

export type MobilePairingStatus = "pending" | "approved" | "redeemed" | "revoked";

/** What the authorization page needs to know about a pairing request. */
export type MobilePairingView =
  | "pending"
  | "approved"
  | "redeemed"
  | "revoked"
  | "expired"
  | "unavailable";

export interface MobilePairingSummary {
  status: MobilePairingView;
  deviceName: string | null;
  expiresAt: string | null;
}

/** The only scope a mobile device can currently request. */
export type MobileScope = "data";

export interface MobileAccessIdentity {
  userId: string;
  deviceId: string;
  scopes: string[];
}
