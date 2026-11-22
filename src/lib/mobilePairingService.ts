import "server-only";

import { Types } from "mongoose";

import { notFound } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import {
  formatPairingCode,
  generatePairingCode,
  generatePairingId,
  hashPairingCode,
} from "@/lib/mobileTokens";
import type { MobilePairStartInput } from "@/lib/shared/schemas";
import MobilePairingModel from "@/models/MobilePairing";
import type { MobilePairingSummary, MobilePairingView } from "@/types/MobileAuth";

void MobilePairingModel;

/** How long the browser has to approve the request the phone started. */
const PAIRING_TTL_MS = 10 * 60 * 1000;
/** How long the typed code works once the browser approves. */
const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;

export interface StartPairingResult {
  pairingId: string;
  verificationUrl: string;
  expiresAt: string;
}

export interface ApprovePairingResult {
  code: string;
  expiresAt: string;
  deviceName: string | null;
}

/** The phone calls this before opening the browser. */
export async function startPairing(
  input: MobilePairStartInput,
  baseUrl: string
): Promise<StartPairingResult> {
  await connectDB();
  const now = Date.now();
  const pairingId = generatePairingId();
  const expiresAt = new Date(now + PAIRING_TTL_MS);
  await MobilePairingModel.create({
    pairingId,
    challenge: input.challenge,
    challengeMethod: input.challengeMethod,
    deviceName: input.deviceName ?? null,
    status: "pending",
    expiresAt,
  });
  return {
    pairingId,
    verificationUrl: `${baseUrl}/mobile/authorize?pairing=${encodeURIComponent(pairingId)}`,
    expiresAt: expiresAt.toISOString(),
  };
}

const UNAVAILABLE: MobilePairingSummary = {
  status: "unavailable",
  deviceName: null,
  expiresAt: null,
};

function statusView(pairingExpired: boolean, status: MobilePairingView): MobilePairingView {
  if (pairingExpired && (status === "pending" || status === "approved")) return "expired";
  return status;
}

/** Read-only view for the authorize page; never exposes the code or hashes. */
export async function getPairingSummary(
  pairingId: string,
  userId: string
): Promise<MobilePairingSummary> {
  await connectDB();
  const pairing = await MobilePairingModel.findOne({ pairingId });
  if (!pairing) return UNAVAILABLE;
  if (pairing.userId && pairing.userId.toString() !== userId) return UNAVAILABLE;

  const now = Date.now();
  const status = statusView(pairing.expiresAt.getTime() <= now, pairing.status);
  if (status === "approved" && pairing.codeExpiresAt) {
    const codeLive = pairing.codeExpiresAt.getTime() > now;
    return {
      status,
      deviceName: pairing.deviceName,
      expiresAt: codeLive ? pairing.codeExpiresAt.toISOString() : null,
    };
  }
  if (status === "pending") {
    return {
      status,
      deviceName: pairing.deviceName,
      expiresAt: pairing.expiresAt.toISOString(),
    };
  }
  return { status, deviceName: pairing.deviceName, expiresAt: null };
}

/**
 * Called from the signed-in web page. Re-approving replaces the previous code,
 * which is how the page recovers when the first code went stale.
 */
export async function approvePairing(
  userId: string,
  pairingId: string
): Promise<ApprovePairingResult> {
  await connectDB();
  const now = new Date();
  const code = generatePairingCode();
  const codeExpiresAt = new Date(now.getTime() + PAIRING_CODE_TTL_MS);
  const owner = new Types.ObjectId(userId);
  const pairing = await MobilePairingModel.findOneAndUpdate(
    {
      pairingId,
      status: { $in: ["pending", "approved"] },
      expiresAt: { $gt: now },
      $or: [{ userId: null }, { userId: owner }],
    },
    {
      $set: {
        userId: owner,
        status: "approved",
        codeHash: hashPairingCode(code),
        codeExpiresAt,
        approvedAt: now,
      },
      // Never let the pairing record die before the code it just issued.
      $max: { expiresAt: codeExpiresAt },
    },
    { new: true }
  );
  if (!pairing) throw notFound("That link request has expired. Start again on your phone.");
  return {
    code: formatPairingCode(code),
    expiresAt: codeExpiresAt.toISOString(),
    deviceName: pairing.deviceName,
  };
}

/** Deny the request (or cancel it before redeeming). Safe to call twice. */
export async function revokePairing(userId: string, pairingId: string): Promise<void> {
  await connectDB();
  const owner = new Types.ObjectId(userId);
  await MobilePairingModel.updateOne(
    {
      pairingId,
      status: { $in: ["pending", "approved"] },
      $or: [{ userId: null }, { userId: owner }],
    },
    { $set: { status: "revoked", codeHash: null, codeExpiresAt: null } }
  );
}
