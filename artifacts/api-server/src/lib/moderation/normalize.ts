const LEET_SUBSTITUTIONS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

/**
 * Lowercase and map common leet / symbol substitutions.
 */
export function applyLeetSubstitutions(text: string): string {
  return [...text.toLowerCase()].map((char) => LEET_SUBSTITUTIONS[char] ?? char).join("");
}

/**
 * Collapse runs of 3+ identical letters to a single letter.
 * fuuuuck -> fuck, shiiiiit -> shit; book -> book (only double o).
 */
export function collapseRepeatedLetters(text: string): string {
  return text.replace(/(.)\1{2,}/g, "$1");
}

/** Keep letters only (after leet substitution). */
export function compactLetters(text: string): string {
  return applyLeetSubstitutions(text).replace(/[^a-z]/g, "");
}

/** Replace non-letters with spaces for token / word-boundary checks. */
export function normalizeSpaced(text: string): string {
  return applyLeetSubstitutions(text)
    .replace(/[^a-z]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Full normalization pipeline for profanity matching.
 */
export function normalizeForProfanity(text: string): string {
  return collapseRepeatedLetters(compactLetters(text.trim()));
}

/**
 * Per-token normalization (spacing tricks like "f u c k").
 */
export function normalizeTokens(text: string): string[] {
  const spaced = normalizeSpaced(text);
  if (!spaced) return [];
  return spaced.split(" ").map((token) => normalizeForProfanity(token)).filter(Boolean);
}
