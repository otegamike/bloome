import mongoose, { Schema, Types, type Document, type Model } from "mongoose";

/**
 * A linked phone. Only the current access-token hash is stored (short-lived);
 * refresh tokens live in their own collection so each can be rotated.
 */
export interface MobileDeviceDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  deviceName: string | null;
  familyId: string;
  scopes: string[];
  accessTokenHash: string;
  accessExpiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const mobileDeviceSchema = new Schema<MobileDeviceDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceName: { type: String, default: null, maxlength: 60 },
    familyId: { type: String, required: true, index: true },
    scopes: { type: [String], default: ["data"] },
    accessTokenHash: { type: String, required: true, unique: true, select: false },
    accessExpiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const MobileDeviceModel: Model<MobileDeviceDoc> =
  mongoose.models.MobileDevice ??
  mongoose.model<MobileDeviceDoc>("MobileDevice", mobileDeviceSchema);

export default MobileDeviceModel;
