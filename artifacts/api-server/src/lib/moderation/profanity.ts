import { BANNED_WORDS_BY_LENGTH } from "./banned-words.js";
import {
  normalizeForProfanity,
  normalizeSpaced,
  normalizeTokens,
} from "./normalize.js";

export const PROFANITY_REJECTION_MESSAGE = "Please keep Breakroom respectful.";

const SHORT_WORD_MAX_LENGTH = 4;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesShortBannedWord(text: string, normalizedBanned: string): boolean {
  const compact = normalizeForProfanity(text);
  if (compact === normalizedBanned) {
    return true;
  }

  const tokens = normalizeTokens(text);
  if (tokens.some((token) => token === normalizedBanned)) {
    return true;
  }

  const spaced = normalizeSpaced(text);
  if (!spaced) {
    return false;
  }

  const boundaryPattern = new RegExp(`(^|\\s)${escapeRegex(normalizedBanned)}(\\s|$)`);
  if (boundaryPattern.test(spaced)) {
    return true;
  }

  if (
    compact.length >= normalizedBanned.length + 2 &&
    (compact.endsWith(normalizedBanned) || compact.startsWith(normalizedBanned))
  ) {
    return true;
  }

  return false;
}

function matchesLongBannedWord(compact: string, normalizedBanned: string): boolean {
  return compact.includes(normalizedBanned);
}

/**
 * Returns the matched banned word, or null if the text is clean.
 */
export function findProfanity(text: string): string | null {
  if (!text.trim()) {
    return null;
  }

  const compact = normalizeForProfanity(text);

  for (const banned of BANNED_WORDS_BY_LENGTH) {
    const normalizedBanned = normalizeForProfanity(banned);
    if (!normalizedBanned) continue;

    if (normalizedBanned.length <= SHORT_WORD_MAX_LENGTH) {
      if (matchesShortBannedWord(text, normalizedBanned)) {
        return banned;
      }
      continue;
    }

    if (matchesLongBannedWord(compact, normalizedBanned)) {
      return banned;
    }
  }

  return null;
}

export function containsProfanity(text: string): boolean {
  return findProfanity(text) !== null;
}

export function rejectIfProfane(
  ...fields: Array<string | undefined | null>
): { ok: true } | { ok: false; error: string } {
  for (const field of fields) {
    if (!field) continue;
    if (containsProfanity(field)) {
      return { ok: false, error: PROFANITY_REJECTION_MESSAGE };
    }
  }
  return { ok: true };
}
