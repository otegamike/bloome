import mongoose, { Schema, Types, type Document, type Model } from "mongoose";

import type { SharedUser } from "@/types/User";

export interface UserDoc
  extends Omit<SharedUser, "id" | "emailVerified" | "pushSubscriptions">,
    Document {
  _id: Types.ObjectId;
  emailVerified: Date | null;
  passwordHash?: string;
  pushTestAt?: Date;
  pushSubscriptions: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
    createdAt: Date;
  }[];
}

const pushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, minlength: 1, maxlength: 60 },
    image: { type: String },
    passwordHash: { type: String, select: false },
    emailVerified: { type: Date, default: null },
    providers: { type: [String], enum: ["credentials", "google"], default: [] },
    timezone: { type: String, default: "UTC" },
    theme: { type: String, enum: ["blush", "rose", "peach"], default: "blush" },
    reminder: {
      enabled: { type: Boolean, default: false },
      time: { type: String, default: "20:00" },
      onPlaceboDays: { type: Boolean, default: true },
      lastSentDay: { type: String, default: null },
    },
    pushSubscriptions: { type: [pushSubscriptionSchema], default: [] },
    pushTestAt: { type: Date },
  },
  { timestamps: true },
);

export const UserModel: Model<UserDoc> =
  mongoose.models.User ?? mongoose.model<UserDoc>("User", userSchema);

export default UserModel;
