import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface AuthAttemptDoc extends Document {
  key: string;
  count: number;
  expiresAt: Date;
}

const authAttemptSchema = new Schema<AuthAttemptDoc>({
  key: { type: String, required: true },
  count: { type: Number, required: true, default: 1 },
  expiresAt: { type: Date, required: true },
});

authAttemptSchema.index({ key: 1 });
authAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthAttemptModel: Model<AuthAttemptDoc> =
  mongoose.models.AuthAttempt ?? mongoose.model<AuthAttemptDoc>("AuthAttempt", authAttemptSchema);

export default AuthAttemptModel;
