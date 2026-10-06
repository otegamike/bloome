import mongoose, { Schema, type Document, type Model } from "mongoose";

/**
 * LLM-suggested notification lines. Curated messages stay in code; only
 * generated candidates live here, gated by `status`. The picker reads
 * `approved` rows only. (Phase 2 generation script not yet built.)
 */
export interface ReminderMessageDoc extends Document {
  text: string;
  /** Lowercased, punctuation stripped; unique for duplicate detection. */
  normalized: string;
  source: "llm";
  status: "pending" | "approved" | "rejected";
  usesName: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reminderMessageSchema = new Schema<ReminderMessageDoc>(
  {
    text: { type: String, required: true, maxlength: 80 },
    normalized: { type: String, required: true, unique: true },
    source: { type: String, enum: ["llm"], default: "llm" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    usesName: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ReminderMessageModel: Model<ReminderMessageDoc> =
  mongoose.models.ReminderMessage ??
  mongoose.model<ReminderMessageDoc>("ReminderMessage", reminderMessageSchema);

export default ReminderMessageModel;
