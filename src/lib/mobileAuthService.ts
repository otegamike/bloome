import "server-only";

import { Types } from "mongoose";

import { unauthorized } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import {
  MOBILE_ACCESS_TTL_MS,
  MOBILE_DATA_SCOPE,
  MOBILE_REFRESH_TTL_MS,
  computePkceChallenge,
  generateAccessToken,
  generateFamilyId,
  generateRefreshToken,
  hashMobileToken,
  hashPairingCode,
} from "@/lib/mobileTokens";
import type { MobilePairRedeemInput } from "@/lib/shared/schemas";
import MobileDeviceModel from "@/models/MobileDevice";
import MobilePairingModel from "@/models/MobilePairing";
import MobileRefreshTokenModel from "@/models/MobileRefreshToken";
import type { MobileTokenResponse } from "@/types/api";
import type { MobileAccessIdentity } from "@/types/MobileAuth";

void MobileDeviceModel;
void MobilePairingModel;
void MobileRefreshTokenModel;

const BEARER_CHALLENGE = { "WWW-Authenticate": "Bearer" };

function invalidRefresh() {
  return unauthorized("Please sign in again", BEARER_CHALLENGE);
}

function tokenResponse(
  accessToken: string,
  accessExpiresAt: Date,
  refreshToken: string,
  refreshExpiresAt: Date
): MobileTokenResponse {
  return {
    tokenType: "Bearer",
    accessToken,
    accessExpiresAt: accessExpiresAt.toISOString(),
    refreshToken,
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    scope: MOBILE_DATA_SCOPE,
  };
}

async function issueDeviceCredentials(
  userId: Types.ObjectId,
  deviceName: string | null
): Promise<MobileTokenResponse> {
  const now = new Date();
  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();
  const accessExpiresAt = new Date(now.getTime() + MOBILE_ACCESS_TTL_MS);
  const refreshExpiresAt = new Date(now.getTime() + MOBILE_REFRESH_TTL_MS);

  const device = await MobileDeviceModel.create({
    userId,
    deviceName,
    familyId: generateFamilyId(),
    scopes: [MOBILE_DATA_SCOPE],
    accessTokenHash: hashMobileToken(accessToken),
    accessExpiresAt,
    lastUsedAt: now,
  });
  await MobileRefreshTokenModel.create({
    deviceId: device._id,
    userId,
    tokenHash: hashMobileToken(refreshToken),
    expiresAt: refreshExpiresAt,
  });
  return tokenResponse(accessToken, accessExpiresAt, refreshToken, refreshExpiresAt);
}

/** Revoke a device and every refresh token it owns. */
export async function revokeMobileDevice(deviceId: Types.ObjectId): Promise<void> {
  const now = new Date();
  await MobileDeviceModel.updateOne(
    { _id: deviceId, revokedAt: null },
    { $set: { revokedAt: now } }
  );
  await MobileRefreshTokenModel.updateMany(
    { deviceId, revokedAt: null },
    { $set: { revokedAt: now } }
  );
}

/**
 * Exchange the browser-approved pairing plus the PKCE verifier for the first
 * device credentials. A single atomic update makes the code one-time-use.
 */
export async function redeemPairing(
  input: MobilePairRedeemInput
): Promise<MobileTokenResponse> {
  await connectDB();
  const now = new Date();
  const pairing = await MobilePairingModel.findOneAndUpdate(
    {
      pairingId: input.pairingId,
      status: "approved",
      challenge: computePkceChallenge(input.verifier),
      challengeMethod: "S256",
      codeHash: hashPairingCode(input.code),
      codeExpiresAt: { $gt: now },
      expiresAt: { $gt: now },
      userId: { $ne: null },
    },
    {
      $set: {
        status: "redeemed",
        redeemedAt: now,
        codeHash: null,
        codeExpiresAt: null,
      },
    },
    { new: true }
  );
  if (!pairing?.userId) {
    throw unauthorized("This link has expired. Start again on your phone.");
  }
  return issueDeviceCredentials(pairing.userId, pairing.deviceName);
}

/**
 * Rotate the refresh token. If a token that was already exchanged comes back,
 * treat it as stolen and revoke the whole device.
 */
export async function refreshMobileSession(rawToken: string): Promise<MobileTokenResponse> {
  await connectDB();
  const now = new Date();
  const record = await MobileRefreshTokenModel.findOne({
    tokenHash: hashMobileToken(rawToken),
  });
  if (!record) throw invalidRefresh();

  const device = await MobileDeviceModel.findById(record.deviceId);
  if (!device || device.revokedAt || device.userId.toString() !== record.userId.toString()) {
    throw invalidRefresh();
  }
  if (record.usedAt) {
    await revokeMobileDevice(device._id);
    throw invalidRefresh();
  }
  if (record.revokedAt || record.expiresAt.getTime() <= now.getTime()) {
    throw invalidRefresh();
  }

  const claimed = await MobileRefreshTokenModel.findOneAndUpdate(
    { _id: record._id, usedAt: null, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { new: true }
  );
  if (!claimed) {
    // Lost the race, or the token was revoked between the read and the claim.
    await revokeMobileDevice(device._id);
    throw invalidRefresh();
  }

  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();
  const accessExpiresAt = new Date(now.getTime() + MOBILE_ACCESS_TTL_MS);
  const refreshExpiresAt = new Date(now.getTime() + MOBILE_REFRESH_TTL_MS);
  const nextTokenHash = hashMobileToken(refreshToken);

  await MobileRefreshTokenModel.create({
    deviceId: device._id,
    userId: device.userId,
    tokenHash: nextTokenHash,
    expiresAt: refreshExpiresAt,
  });
  await MobileRefreshTokenModel.updateOne(
    { _id: claimed._id },
    { $set: { replacedByHash: nextTokenHash } }
  );
  await MobileDeviceModel.updateOne(
    { _id: device._id },
    {
      $set: {
        accessTokenHash: hashMobileToken(accessToken),
        accessExpiresAt,
        lastUsedAt: now,
      },
    }
  );

  return tokenResponse(accessToken, accessExpiresAt, refreshToken, refreshExpiresAt);
}

/** Idempotent: an unknown or already-revoked token still returns quietly. */
export async function logoutMobileDevice(rawToken: string): Promise<void> {
  await connectDB();
  const record = await MobileRefreshTokenModel.findOne({
    tokenHash: hashMobileToken(rawToken),
  });
  if (!record) return;
  const device = await MobileDeviceModel.findById(record.deviceId);
  if (device) {
    await revokeMobileDevice(device._id);
    return;
  }
  await MobileRefreshTokenModel.updateOne(
    { _id: record._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

/** Resolve an access token to its user without touching cookies. */
export async function authenticateMobileAccess(
  rawToken: string
): Promise<MobileAccessIdentity | null> {
  await connectDB();
  const now = new Date();
  const device = await MobileDeviceModel.findOne({
    accessTokenHash: hashMobileToken(rawToken),
    revokedAt: null,
    accessExpiresAt: { $gt: now },
  });
  if (!device) return null;

  const lastUsed = device.lastUsedAt?.getTime() ?? 0;
  if (now.getTime() - lastUsed >= 60 * 60 * 1000) {
    await MobileDeviceModel.updateOne({ _id: device._id }, { $set: { lastUsedAt: now } });
  }

  return {
    userId: device.userId.toString(),
    deviceId: device._id.toString(),
    scopes: device.scopes,
  };
}

/** Account deletion: remove every trace of the user's linked phones. */
export async function deleteMobileAuthForUser(userId: string): Promise<void> {
  await connectDB();
  const owner = new Types.ObjectId(userId);
  await MobileRefreshTokenModel.deleteMany({ userId: owner });
  await MobileDeviceModel.deleteMany({ userId: owner });
  await MobilePairingModel.deleteMany({ userId: owner });
}
