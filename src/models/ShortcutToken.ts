import mongoose, { Schema, Types, type Document, type Model } from "mongoose";

/**
 * Revocable per-user API token for the Apple Shortcuts status endpoint.
 * Only the sha256 hash of the secret is stored — the secret itself is
 * returned once at creation and never again.
 */
export interface ShortcutTokenDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  label: string;
  tokenHash: string;
  lastFour: string;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const shortcutTokenSchema = new Schema<ShortcutTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, required: true, minlength: 1, maxlength: 40, trim: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    lastFour: { type: String, required: true },
    scopes: { type: [String], default: ["status:read"] },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

shortcutTokenSchema.index({ userId: 1 });

export const ShortcutTokenModel: Model<ShortcutTokenDoc> =
  mongoose.models.ShortcutToken ??
  mongoose.model<ShortcutTokenDoc>("ShortcutToken", shortcutTokenSchema);

export default ShortcutTokenModel;
