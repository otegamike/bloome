import "server-only";

import { createHash } from "node:crypto";

import { loadApprovedMessages } from "@/lib/reminderMessages/approvedMessages";
import { CURATED_MESSAGES } from "@/lib/reminderMessages/pool";
import { sanitizeFirstName } from "@/lib/reminderMessages/validate";

export interface PickMessageArgs {
  userId: string;
  /** The user's local day as YYYY-MM-DD. */
  localDay: string;
  firstName?: string | null;
}

interface EligibleMessage {
  id: string;
  text: string;
  usesName: boolean;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic per-user shuffle: the same user always gets the same order. */
export function shuffledOrder(userId: string, length: number): number[] {
  const digest = createHash("sha256").update(userId).digest();
  const seed = digest.readUInt32BE(0);
  const random = mulberry32(seed);
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = order[i] as number;
    order[i] = order[j] as number;
    order[j] = a;
  }
  return order;
}

export function dayNumberOf(localDay: string): number {
  const [y, m, d] = localDay.split("-").map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/**
 * One message per user per local day: stable across calls that day, a
 * different one tomorrow, no repeats until the whole bank has been used, and
 * different users walk the bank in different orders. Adding messages can
 * shift today's text once; that is acceptable.
 */
export async function pickMessage({
  userId,
  localDay,
  firstName,
}: PickMessageArgs): Promise<string> {
  const name = sanitizeFirstName(firstName);
  const eligible: EligibleMessage[] = [
    ...CURATED_MESSAGES.map((m) => ({ id: m.id, text: m.text, usesName: m.usesName ?? false })),
    ...(await loadApprovedMessages()),
  ]
    .filter((m) => name !== null || !m.usesName)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (eligible.length === 0) {
    return "Your daily check-in is ready 🌸";
  }
  const order = shuffledOrder(userId, eligible.length);
  const message = eligible[order[dayNumberOf(localDay) % eligible.length] as number];
  if (!message) {
    return "Your daily check-in is ready 🌸";
  }
  return name ? message.text.replaceAll("{name}", name) : message.text;
}
