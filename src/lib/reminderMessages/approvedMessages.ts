import "server-only";

import { connectDB } from "@/lib/db";
import { isSafeMessage } from "@/lib/reminderMessages/validate";
import ReminderMessageModel from "@/models/ReminderMessage";

void ReminderMessageModel;

const CACHE_MS = 10 * 60 * 1000;

export interface ApprovedMessage {
  id: string;
  text: string;
  usesName: boolean;
}

let cache: { at: number; messages: ApprovedMessage[] } | null = null;

/**
 * Approved database messages for the picker, cached ~10 minutes. Falls back
 * to an empty list (curated pool only) when the database is unavailable.
 */
export async function loadApprovedMessages(): Promise<ApprovedMessage[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.messages;
  }
  try {
    await connectDB();
    const docs = await ReminderMessageModel.find({ status: "approved" })
      .select("text usesName")
      .lean();
    const messages = docs
      .filter((doc) => isSafeMessage(doc.text))
      .map((doc) => ({
        id: `db:${doc._id.toString()}`,
        text: doc.text,
        usesName: doc.usesName,
      }));
    cache = { at: Date.now(), messages };
    return messages;
  } catch {
    return cache?.messages ?? [];
  }
}
