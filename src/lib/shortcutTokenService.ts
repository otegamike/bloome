import "server-only";

import { Types } from "mongoose";

import { conflict } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import ShortcutTokenModel, { type ShortcutTokenDoc } from "@/models/ShortcutToken";
import { generateShortcutSecret, hashShortcutSecret, lastFourOfSecret } from "@/lib/shortcutTokens";
import type { CreateShortcutTokenInput } from "@/lib/shared/schemas";
import type { ShortcutTokenDTO } from "@/types/api";

void ShortcutTokenModel;

export const MAX_ACTIVE_SHORTCUT_TOKENS = 5;

export function toShortcutTokenDTO(doc: ShortcutTokenDoc): ShortcutTokenDTO {
  return {
    id: doc._id.toString(),
    label: doc.label,
    lastFour: doc.lastFour,
    createdAt: doc.createdAt.toISOString(),
    lastUsedAt: doc.lastUsedAt ? doc.lastUsedAt.toISOString() : null,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
  };
}

/** A token counts as active while it is neither revoked nor expired. */
function activeFilter(userId: Types.ObjectId, now: Date) {
  return {
    userId,
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };
}

export async function listShortcutTokens(userId: string): Promise<{ tokens: ShortcutTokenDTO[] }> {
  await connectDB();
  const id = new Types.ObjectId(userId);
  const docs = await ShortcutTokenModel.find(activeFilter(id, new Date())).sort({
    createdAt: -1,
  });
  return { tokens: docs.map(toShortcutTokenDTO) };
}

export async function createShortcutToken(
  userId: string,
  input: CreateShortcutTokenInput
): Promise<{ token: ShortcutTokenDTO; secret: string }> {
  await connectDB();
  const id = new Types.ObjectId(userId);
  const now = new Date();
  const active = await ShortcutTokenModel.countDocuments(activeFilter(id, now));
  if (active >= MAX_ACTIVE_SHORTCUT_TOKENS) {
    throw conflict("You already have 5 active tokens. Revoke one first.");
  }
  const secret = generateShortcutSecret();
  const doc = await ShortcutTokenModel.create({
    userId: id,
    label: input.label,
    tokenHash: hashShortcutSecret(secret),
    lastFour: lastFourOfSecret(secret),
    scopes: ["status:read"],
    expiresAt:
      input.expiresInDays === null
        ? null
        : new Date(now.getTime() + input.expiresInDays * 86_400_000),
  });
  // The secret is returned once, here, and never again.
  return { token: toShortcutTokenDTO(doc), secret };
}

/** Idempotent: unknown or foreign ids still answer success. */
export async function revokeShortcutToken(userId: string, tokenId: string): Promise<void> {
  await connectDB();
  if (!Types.ObjectId.isValid(tokenId)) return;
  await ShortcutTokenModel.updateOne(
    { _id: new Types.ObjectId(tokenId), userId: new Types.ObjectId(userId) },
    { $set: { revokedAt: new Date() } }
  );
}
