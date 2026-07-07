export const BREAKROOM_MODERATION_REASONS = [
  "Offensive content",
  "Spam",
  "PHI/privacy concern",
  "Harassment",
  "Unnecessary/off-topic",
  "Duplicate",
  "Other",
] as const;

export type BreakroomModerationReason = (typeof BREAKROOM_MODERATION_REASONS)[number];

export const BREAKROOM_MODERATION_DEFAULT_REASON: BreakroomModerationReason = "Offensive content";

export function normalizeModerationReason(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return BREAKROOM_MODERATION_DEFAULT_REASON;
  }
  const trimmed = value.trim();
  if ((BREAKROOM_MODERATION_REASONS as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  return trimmed.slice(0, 200);
}
