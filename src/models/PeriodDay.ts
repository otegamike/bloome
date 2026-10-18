import mongoose, { Schema, Types, type Document, type Model } from "mongoose";

import type { SharedPeriodDay } from "@/types/PeriodDay";

export interface PeriodDayDoc extends Omit<SharedPeriodDay, "id" | "userId">, Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
}

const periodDaySchema = new Schema<PeriodDayDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    day: { type: String, required: true },
  },
  { timestamps: true },
);

periodDaySchema.index({ userId: 1, day: 1 }, { unique: true });

export const PeriodDayModel: Model<PeriodDayDoc> =
  mongoose.models.PeriodDay ?? mongoose.model<PeriodDayDoc>("PeriodDay", periodDaySchema);

export default PeriodDayModel;
