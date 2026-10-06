/**
 * Review LLM-suggested notification messages.
 *
 *   npm run messages:review                          # list pending messages
 *   npm run messages:review -- --approve <id>,<id>   # approve by id
 *   npm run messages:review -- --reject <id>         # reject by id
 *   npm run messages:review -- --approve-all         # approve everything pending
 *
 * Needs MONGODB_URI in the environment (loads .env.local when present).
 * Prints counts only, never secrets.
 */
import { readFileSync } from "node:fs";

import mongoose from "mongoose";

import { connectDB } from "../src/lib/db";
import ReminderMessageModel from "../src/models/ReminderMessage";

/** Load .env.local when present (manual runs don't get Next.js env for free). */
function loadLocalEnv(): void {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
      let value = trimmed.slice(trimmed.indexOf("=") + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // No local env file; rely on the environment.
  }
}

loadLocalEnv();

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

function parseIds(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
}

async function main(): Promise<void> {
  await connectDB();
  const approveAll = process.argv.includes("--approve-all");
  const approveIds = parseIds(argValue("--approve"));
  const rejectIds = parseIds(argValue("--reject"));

  if (approveAll) {
    const result = await ReminderMessageModel.updateMany(
      { status: "pending" },
      { $set: { status: "approved" } }
    );
    console.log(`Approved ${result.modifiedCount} pending message(s).`);
  } else if (approveIds.length > 0 || rejectIds.length > 0) {
    const approved =
      approveIds.length > 0
        ? await ReminderMessageModel.updateMany(
            { _id: { $in: approveIds }, status: "pending" },
            { $set: { status: "approved" } }
          )
        : null;
    const rejected =
      rejectIds.length > 0
        ? await ReminderMessageModel.updateMany(
            { _id: { $in: rejectIds }, status: "pending" },
            { $set: { status: "rejected" } }
          )
        : null;
    console.log(
      `Approved ${approved?.modifiedCount ?? 0}, rejected ${rejected?.modifiedCount ?? 0}.`
    );
  } else {
    const pending = await ReminderMessageModel.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .lean();
    if (pending.length === 0) {
      console.log("No pending messages.");
    } else {
      for (const message of pending) {
        console.log(`${message._id.toString()}  ${message.text}`);
      }
      console.log(`${pending.length} pending message(s).`);
    }
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("messages:review failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
