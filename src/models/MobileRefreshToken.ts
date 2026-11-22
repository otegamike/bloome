import mongoose, { Schema, Types, type Document, type Model } from "mongoose";

/**
 * Rotating refresh token. Every refresh marks the row used and issues a new
 * one, so a replayed token is detectable: if `usedAt` is already set the
 * whole device family is revoked.
 */
export interface MobileRefreshTokenDoc extends Document {
  _id: Types.ObjectId;
  deviceId: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  replacedByHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const mobileRefreshTokenSchema = new Schema<MobileRefreshTokenDoc>(
  {
    deviceId: { type: Schema.Types.ObjectId, ref: "MobileDevice", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
  },
  { timestamps: true }
);

mobileRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MobileRefreshTokenModel: Model<MobileRefreshTokenDoc> =
  mongoose.models.MobileRefreshToken ??
  mongoose.model<MobileRefreshTokenDoc>("MobileRefreshToken", mobileRefreshTokenSchema);

export default MobileRefreshTokenModel;
