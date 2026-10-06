// Pure rules every notification message must satisfy. The same list guards
// the curated pool, the picker, and any future message generation.

/**
 * Case-insensitive patterns that must never appear in notification text.
 * Deliberately broad: nothing leaving the server for a notification may hint
 * at what the app tracks.
 */
export const BANNED_MESSAGE_PATTERNS = [
  "pill",
  "birth",
  "control",
  "contracepti",
  "medic",
  "tablet",
  "dose|dosage",
  "hormon",
  "pregnan",
  "period",
  "ovulat",
  "placebo",
  "levofem",
  "pack",
  "cycle",
  "prescri",
  "doctor",
  "health",
  "sex",
  "intimate",
  "take your",
] as const;

export const MESSAGE_EMOJI_ALLOWLIST = ["🌸", "✨", "🌙", "🌷", "🌿", "💗"] as const;

export const MAX_MESSAGE_LENGTH = 80;

const EMOJI_RE = /\p{Extended_Pictographic}/u;

export function isSafeMessage(text: string): boolean {
  if (!text || text.length > MAX_MESSAGE_LENGTH) return false;
  // No numbers, streaks, counts, or day references.
  if (/\d/.test(text)) return false;
  for (const pattern of BANNED_MESSAGE_PATTERNS) {
    if (new RegExp(pattern, "i").test(text)) return false;
  }
  // At most one emoji, only from the allowlist.
  let emojiCount = 0;
  for (const char of text) {
    if ((MESSAGE_EMOJI_ALLOWLIST as readonly string[]).includes(char)) {
      emojiCount += 1;
    } else if (EMOJI_RE.test(char)) {
      return false;
    }
  }
  return emojiCount <= 1;
}

/** Canonical form for duplicate detection: lowercase, no punctuation. */
export function normalizeMessage(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * First names may appear inside messages via `{name}`. Keep only plain
 * names (Unicode letters, spaces, hyphens, apostrophes, max 20 chars);
 * anything else counts as "no usable name".
 */
export function sanitizeFirstName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed || !/^[\p{L} '\-’]+$/u.test(trimmed)) return null;
  return trimmed;
}
