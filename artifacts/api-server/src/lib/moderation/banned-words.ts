/**
 * Banned word list for Breakroom moderation.
 * Add or remove entries here — matching uses normalized text (see normalize.ts).
 */
export const BANNED_WORDS = [
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "fck",
  "shit",
  "bullshit",
  "ass",
  "asshole",
  "bitch",
  "bitches",
  "bastard",
  "damn",
  "goddamn",
  "crap",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "slut",
  "whore",
  "twat",
  "prick",
  "wanker",
  "jackass",
  "douche",
  "douchebag",
  "dipshit",
  "retard",
  "retarded",
  "idiot",
  "moron",
  "stupid",
  "loser",
  "jerk",
  "scumbag",
  "pieceofshit",
  "wtf",
  "stfu",
  "gtfo",
  "lmfao",
] as const;

export type BannedWord = (typeof BANNED_WORDS)[number];

/** Longest first so "asshole" matches before "ass". */
export const BANNED_WORDS_BY_LENGTH = [...BANNED_WORDS].sort((a, b) => b.length - a.length);
