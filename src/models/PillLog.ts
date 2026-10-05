import mongoose, { Schema, Types, type Document, type Model } from "mongoose";

import type { SharedLog } from "@/types/PillLog";

export interface PillLogDoc extends Omit<SharedLog, "id" | "userId" | "takenAt">, Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  takenAt: Date;
}

const pillLogSchema = new Schema<PillLogDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    day: { type: String, required: true },
    status: { type: String, enum: ["taken", "skipped"], required: true },
    note: { type: String, maxlength: 200 },
    takenAt: { type: Date, required: true },
    loggedLate: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

pillLogSchema.index({ userId: 1, day: 1 }, { unique: true });

export const PillLogModel: Model<PillLogDoc> =
  mongoose.models.PillLog ?? mongoose.model<PillLogDoc>("PillLog", pillLogSchema);

export default PillLogModel;
