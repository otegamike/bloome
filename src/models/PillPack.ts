import mongoose, { Schema, Types, type Document, type Model } from "mongoose";

import type { SharedPack } from "@/types/PillPack";

export interface PillPackDoc extends Omit<SharedPack, "id" | "userId">, Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
}

const pillPackSchema = new Schema<PillPackDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, minlength: 1, maxlength: 60 },
    activeDays: { type: Number, required: true, min: 1, max: 120 },
    placeboDays: { type: Number, required: true, min: 0, max: 14 },
    startDay: { type: String, required: true },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

pillPackSchema.index({ userId: 1, startDay: 1 }, { unique: true });
pillPackSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } },
);

export const PillPackModel: Model<PillPackDoc> =
  mongoose.models.PillPack ?? mongoose.model<PillPackDoc>("PillPack", pillPackSchema);

export default PillPackModel;
