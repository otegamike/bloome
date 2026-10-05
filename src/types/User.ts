import type { DayString } from "@/types";
import type { ThemeName } from "@/types";

// Plain shared shape for a user (string ids). The Mongoose model derives
// from this with ObjectId forms; API responses use MeResponse instead.

export type AuthProvider = "credentials" | "google";

export interface ReminderShape {
  enabled: boolean;
  time: string;
  lastSentDay: DayString | null;
}

export interface StoredPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: string;
}

export interface SharedUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: string | null;
  providers: AuthProvider[];
  timezone: string;
  theme: ThemeName;
  reminder: ReminderShape;
  pushSubscriptions: StoredPushSubscription[];
}
