export const BREAKROOM_SESSION_COOKIE = "rr_breakroom_session";
export const BREAKROOM_SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const BREAKROOM_POST_TITLE_MAX = 120;
export const BREAKROOM_POST_BODY_MIN = 2;
export const BREAKROOM_POST_BODY_MAX = 3000;
export const BREAKROOM_COMMENT_BODY_MIN = 1;
export const BREAKROOM_COMMENT_BODY_MAX = 1000;
export const BREAKROOM_NICKNAME_MAX = 40;

export const BREAKROOM_REPORT_AUTO_HIDE_THRESHOLD = 5;

export const BREAKROOM_REACTION_TYPES = ["like", "laugh", "support", "coffee"] as const;
export type BreakroomReactionType = (typeof BREAKROOM_REACTION_TYPES)[number];

export const BREAKROOM_RATE_LIMITS = {
  createPost: { windowMs: 15 * 60 * 1000, max: 5 },
  createComment: { windowMs: 15 * 60 * 1000, max: 20 },
  reaction: { windowMs: 15 * 60 * 1000, max: 60 },
  mutate: { windowMs: 15 * 60 * 1000, max: 20 },
  report: { windowMs: 15 * 60 * 1000, max: 10 },
} as const;

export const BREAKROOM_ALLOWED_POST_KEYS = new Set([
  "title",
  "body",
  "nickname",
  "anonymous",
  "companyWebsite",
]);

export const BREAKROOM_ALLOWED_COMMENT_KEYS = new Set([
  "body",
  "nickname",
  "anonymous",
  "companyWebsite",
]);

export const BREAKROOM_ALLOWED_EDIT_POST_KEYS = new Set([
  "title",
  "body",
  "companyWebsite",
]);

export const BREAKROOM_ALLOWED_REACTION_KEYS = new Set(["type", "companyWebsite"]);

export const BREAKROOM_CONTENT_STATUSES = ["published", "pending_review", "rejected"] as const;
export type BreakroomContentStatus = (typeof BREAKROOM_CONTENT_STATUSES)[number];

export const BREAKROOM_PENDING_REVIEW_POST_MESSAGE =
  "Your post needs review before it can appear.";
export const BREAKROOM_PENDING_REVIEW_COMMENT_MESSAGE =
  "Your comment needs review before it can appear.";

export const OPENAI_MODERATION_MODEL = "omni-moderation-latest";
