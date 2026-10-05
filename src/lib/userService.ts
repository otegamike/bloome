import "server-only";

import bcrypt from "bcryptjs";
import { Types } from "mongoose";

import { conflict, notFound } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import AuthAttemptModel from "@/models/AuthAttempt";
import PillLogModel from "@/models/PillLog";
import PillPackModel from "@/models/PillPack";
import UserModel, { type UserDoc } from "@/models/User";
import type { MeUpdateInput, RegisterInput } from "@/lib/shared/schemas";
import type { MeResponse } from "@/types/api";

void AuthAttemptModel;
void PillLogModel;
void PillPackModel;
void UserModel;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toMeResponse(doc: UserDoc): MeResponse {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    image: doc.image ?? null,
    providers: doc.providers as ("credentials" | "google")[],
    timezone: doc.timezone,
    theme: doc.theme as MeResponse["theme"],
    reminder: { enabled: doc.reminder.enabled, time: doc.reminder.time },
    pushDeviceCount: doc.pushSubscriptions.length,
  };
}

export async function createCredentialsUser(input: RegisterInput): Promise<UserDoc> {
  await connectDB();
  const email = normalizeEmail(input.email);
  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    throw conflict("Could not create an account with those details");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  return UserModel.create({
    email,
    name: input.name,
    passwordHash,
    providers: ["credentials"],
    emailVerified: null,
    timezone: input.timezone,
  });
}

/** Load a user plus their hidden password hash for credential checks. */
export async function findByEmailWithHash(email: string): Promise<UserDoc | null> {
  await connectDB();
  return UserModel.findOne({ email: normalizeEmail(email) }).select("+passwordHash");
}

export async function verifyCredentials(email: string, password: string): Promise<UserDoc | null> {
  const user = await findByEmailWithHash(email);
  if (!user?.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function findByEmail(email: string): Promise<UserDoc | null> {
  await connectDB();
  return UserModel.findOne({ email: normalizeEmail(email) });
}

export interface GoogleLinkInput {
  email: string;
  name: string | null;
  image: string | null;
}

/**
 * Create-or-link for a verified Google email. Linking wipes a leftover
 * unverified password hash so a pre-registered password can't ride along.
 */
export async function findOrLinkGoogleUser(input: GoogleLinkInput): Promise<UserDoc> {
  await connectDB();
  const email = normalizeEmail(input.email);
  const existing = await UserModel.findOne({ email });
  if (!existing) {
    return UserModel.create({
      email,
      name: input.name ?? email,
      image: input.image ?? undefined,
      emailVerified: new Date(),
      providers: ["google"],
      timezone: "UTC",
    });
  }
  let changed = false;
  if (!existing.providers.includes("google")) {
    existing.providers.push("google");
    changed = true;
  }
  if (!existing.emailVerified) {
    existing.emailVerified = new Date();
    existing.passwordHash = undefined;
    changed = true;
  }
  if (!existing.image && input.image) {
    existing.image = input.image;
    changed = true;
  }
  if (changed) await existing.save();
  return existing;
}

export async function getMe(userId: string): Promise<MeResponse> {
  await connectDB();
  const user = await UserModel.findById(new Types.ObjectId(userId));
  if (!user) throw notFound("Account not found");
  return toMeResponse(user);
}

export async function updateMe(userId: string, input: MeUpdateInput): Promise<MeResponse> {
  await connectDB();
  const user = await UserModel.findById(new Types.ObjectId(userId));
  if (!user) throw notFound("Account not found");
  if (input.name !== undefined) user.name = input.name;
  if (input.timezone !== undefined) user.timezone = input.timezone;
  if (input.theme !== undefined) user.theme = input.theme;
  if (input.reminder !== undefined) {
    user.reminder.enabled = input.reminder.enabled;
    user.reminder.time = input.reminder.time;
  }
  await user.save();
  return toMeResponse(user);
}

/** Remove every row that belongs to the user, then the user. */
export async function deleteAccount(userId: string): Promise<void> {
  await connectDB();
  const id = new Types.ObjectId(userId);
  await PillLogModel.deleteMany({ userId: id });
  await PillPackModel.deleteMany({ userId: id });
  await UserModel.deleteOne({ _id: id });
}
