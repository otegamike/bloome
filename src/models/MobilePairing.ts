import mongoose, { Schema, Types, type Document, type Model } from "mongoose";

import type { MobilePairingStatus } from "@/types/MobileAuth";

/**
 * One pending "link a phone" handoff. The phone starts it with a PKCE
 * challenge; the signed-in web browser approves it and a one-time code binds
 * the two; the phone redeems the code once with its verifier.
 */
export interface MobilePairingDoc extends Document {
  _id: Types.ObjectId;
  pairingId: string;
  challenge: string;
  challengeMethod: "S256";
  deviceName: string | null;
  status: MobilePairingStatus;
  userId: Types.ObjectId | null;
  codeHash: string | null;
  codeExpiresAt: Date | null;
  expiresAt: Date;
  approvedAt: Date | null;
  redeemedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const mobilePairingSchema = new Schema<MobilePairingDoc>(
  {
    pairingId: { type: String, required: true, unique: true },
    challenge: { type: String, required: true },
    challengeMethod: { type: String, enum: ["S256"], required: true },
    deviceName: { type: String, default: null, maxlength: 60 },
    status: {
      type: String,
      enum: ["pending", "approved", "redeemed", "revoked"],
      default: "pending",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    codeHash: { type: String, default: null, select: false },
    codeExpiresAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    approvedAt: { type: Date, default: null },
    redeemedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

mobilePairingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MobilePairingModel: Model<MobilePairingDoc> =
  mongoose.models.MobilePairing ??
  mongoose.model<MobilePairingDoc>("MobilePairing", mobilePairingSchema);

export default MobilePairingModel;
