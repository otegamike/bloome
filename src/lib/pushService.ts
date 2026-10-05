import "server-only";

import { Types } from "mongoose";
import webpush from "web-push";

import { ApiError, notFound } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import UserModel, { type UserDoc } from "@/models/User";
import { APP_NAME } from "@/lib/shared/config";
import type { PushSubscriptionInput } from "@/lib/shared/schemas";

void UserModel;

const MAX_DEVICES = 5;
const TEST_COOLDOWN_MS = 60 * 1000;

let vapidReady = false;

function ensureVapid(): void {
  if (vapidReady) return;
  const env = getEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new Error("Push notifications are not configured");
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  vapidReady = true;
}

function payload(): string {
  return JSON.stringify({
    title: APP_NAME,
    body: "Your daily check-in is ready 🌸",
    tag: "daily-reminder",
    url: "/",
  });
}

export interface SendResult {
  sent: number;
  removed: number;
}

/** Send to every stored subscription; prune dead ones (404/410). */
export async function sendToUser(user: UserDoc): Promise<SendResult> {
  ensureVapid();
  const body = payload();
  const dead: string[] = [];
  let sent = 0;
  for (const sub of user.pushSubscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        body,
        { TTL: 3600, urgency: "normal" },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: unknown }).statusCode;
      if (status === 404 || status === 410) {
        dead.push(sub.endpoint);
      } else {
        console.error("[push]", typeof status === "number" ? status : "send failed");
      }
    }
  }
  if (dead.length > 0) {
    user.pushSubscriptions = user.pushSubscriptions.filter((s) => !dead.includes(s.endpoint));
    await user.save();
  }
  return { sent, removed: dead.length };
}

export async function subscribeDevice(
  userId: string,
  input: PushSubscriptionInput,
  userAgent: string | null,
): Promise<void> {
  await connectDB();
  const user = await UserModel.findById(new Types.ObjectId(userId));
  if (!user) throw notFound("Account not found");
  const existing = user.pushSubscriptions.find((s) => s.endpoint === input.endpoint);
  if (existing) {
    existing.keys = input.keys;
    if (userAgent) existing.userAgent = userAgent;
  } else {
    user.pushSubscriptions.push({
      endpoint: input.endpoint,
      keys: input.keys,
      userAgent: userAgent ?? undefined,
      createdAt: new Date(),
    });
    while (user.pushSubscriptions.length > MAX_DEVICES) {
      user.pushSubscriptions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      user.pushSubscriptions.shift();
    }
  }
  await user.save();
}

export async function unsubscribeDevice(userId: string, endpoint: string): Promise<void> {
  await connectDB();
  const user = await UserModel.findById(new Types.ObjectId(userId));
  if (!user) throw notFound("Account not found");
  user.pushSubscriptions = user.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
  await user.save();
}

export async function sendTestNotification(userId: string): Promise<{ sent: number }> {
  await connectDB();
  const user = await UserModel.findById(new Types.ObjectId(userId));
  if (!user) throw notFound("Account not found");
  const last = user.pushTestAt?.getTime() ?? 0;
  if (Date.now() - last < TEST_COOLDOWN_MS) {
    throw new ApiError(429, "Please wait a minute between test notifications");
  }
  const { sent } = await sendToUser(user);
  user.pushTestAt = new Date();
  await user.save();
  return { sent };
}
