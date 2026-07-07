import { z } from "zod";
import {
  BREAKROOM_ALLOWED_COMMENT_KEYS,
  BREAKROOM_ALLOWED_EDIT_POST_KEYS,
  BREAKROOM_ALLOWED_POST_KEYS,
  BREAKROOM_ALLOWED_REACTION_KEYS,
  BREAKROOM_COMMENT_BODY_MAX,
  BREAKROOM_COMMENT_BODY_MIN,
  BREAKROOM_NICKNAME_MAX,
  BREAKROOM_POST_BODY_MAX,
  BREAKROOM_POST_BODY_MIN,
  BREAKROOM_POST_TITLE_MAX,
  BREAKROOM_REACTION_TYPES,
} from "./breakroom-constants.js";
import { sanitizeText } from "./sanitize.js";

const MONGO_OPERATOR_PATTERN = /^\$/;

export function containsMongoOperators(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsMongoOperators(item));
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (MONGO_OPERATOR_PATTERN.test(key) || containsMongoOperators(nested)) {
      return true;
    }
  }
  return false;
}

function rejectUnexpectedKeys(
  record: Record<string, unknown>,
  allowed: Set<string>,
): string | null {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      return "Invalid request fields.";
    }
  }
  return null;
}

function honeypotTriggered(record: Record<string, unknown>): boolean {
  return typeof record.companyWebsite === "string" && record.companyWebsite.trim().length > 0;
}

const nicknameSchema = z
  .string()
  .max(BREAKROOM_NICKNAME_MAX)
  .optional()
  .transform((value) => (value ? sanitizeText(value, BREAKROOM_NICKNAME_MAX) : ""));

const postBodySchema = z
  .string()
  .min(BREAKROOM_POST_BODY_MIN, "Post body is required.")
  .max(BREAKROOM_POST_BODY_MAX, "Post is too long.")
  .transform((value) => sanitizeText(value, BREAKROOM_POST_BODY_MAX))
  .refine((value) => value.length >= BREAKROOM_POST_BODY_MIN, "Post body is required.");

const commentBodySchema = z
  .string()
  .min(BREAKROOM_COMMENT_BODY_MIN, "Comment is required.")
  .max(BREAKROOM_COMMENT_BODY_MAX, "Comment is too long.")
  .transform((value) => sanitizeText(value, BREAKROOM_COMMENT_BODY_MAX))
  .refine((value) => value.length >= BREAKROOM_COMMENT_BODY_MIN, "Comment is required.");

export type ValidationResult<T> =
  | { ok: true; data: T; isHoneypotTriggered?: boolean }
  | { ok: false; error: string; status: number };

export interface ValidatedCreatePost {
  title: string;
  body: string;
  nickname: string;
  anonymous: boolean;
}

export interface ValidatedEditPost {
  title?: string;
  body?: string;
}

export interface ValidatedCreateComment {
  body: string;
  nickname: string;
  anonymous: boolean;
}

export interface ValidatedReaction {
  type: (typeof BREAKROOM_REACTION_TYPES)[number];
}

export function validateCreatePostBody(body: unknown): ValidationResult<ValidatedCreatePost> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  if (containsMongoOperators(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }

  const record = body as Record<string, unknown>;
  const unexpected = rejectUnexpectedKeys(record, BREAKROOM_ALLOWED_POST_KEYS);
  if (unexpected) return { ok: false, error: unexpected, status: 400 };
  if (honeypotTriggered(record)) {
    return { ok: true, data: { title: "", body: "", nickname: "", anonymous: true }, isHoneypotTriggered: true };
  }

  const schema = z.object({
    title: z
      .string()
      .max(BREAKROOM_POST_TITLE_MAX, "Title is too long.")
      .optional()
      .transform((value) => (value ? sanitizeText(value, BREAKROOM_POST_TITLE_MAX) : "")),
    body: postBodySchema,
    nickname: nicknameSchema,
    anonymous: z.boolean().optional().default(false),
  });

  const parsed = schema.safeParse(record);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
    return { ok: false, error: message, status: 400 };
  }

  const nickname = parsed.data.anonymous ? "Anonymous" : parsed.data.nickname || "Anonymous";
  return {
    ok: true,
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      nickname: sanitizeText(nickname, BREAKROOM_NICKNAME_MAX) || "Anonymous",
      anonymous: parsed.data.anonymous,
    },
  };
}

export function validateEditPostBody(body: unknown): ValidationResult<ValidatedEditPost> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  if (containsMongoOperators(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }

  const record = body as Record<string, unknown>;
  const unexpected = rejectUnexpectedKeys(record, BREAKROOM_ALLOWED_EDIT_POST_KEYS);
  if (unexpected) return { ok: false, error: unexpected, status: 400 };
  if (honeypotTriggered(record)) {
    return { ok: true, data: {}, isHoneypotTriggered: true };
  }

  const schema = z
    .object({
      title: z
        .string()
        .max(BREAKROOM_POST_TITLE_MAX, "Title is too long.")
        .optional()
        .transform((value) => (value ? sanitizeText(value, BREAKROOM_POST_TITLE_MAX) : undefined)),
      body: z
        .string()
        .min(BREAKROOM_POST_BODY_MIN, "Post body is required.")
        .max(BREAKROOM_POST_BODY_MAX, "Post is too long.")
        .optional()
        .transform((value) => (value ? sanitizeText(value, BREAKROOM_POST_BODY_MAX) : undefined)),
    })
    .refine((value) => value.title !== undefined || value.body !== undefined, {
      message: "Nothing to update.",
    });

  const parsed = schema.safeParse(record);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
    return { ok: false, error: message, status: 400 };
  }

  if (parsed.data.body !== undefined && parsed.data.body.length < BREAKROOM_POST_BODY_MIN) {
    return { ok: false, error: "Post body is required.", status: 400 };
  }

  return { ok: true, data: parsed.data };
}

export function validateCreateCommentBody(body: unknown): ValidationResult<ValidatedCreateComment> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  if (containsMongoOperators(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }

  const record = body as Record<string, unknown>;
  const unexpected = rejectUnexpectedKeys(record, BREAKROOM_ALLOWED_COMMENT_KEYS);
  if (unexpected) return { ok: false, error: unexpected, status: 400 };
  if (honeypotTriggered(record)) {
    return { ok: true, data: { body: "", nickname: "", anonymous: true }, isHoneypotTriggered: true };
  }

  const schema = z.object({
    body: commentBodySchema,
    nickname: nicknameSchema,
    anonymous: z.boolean().optional().default(false),
  });

  const parsed = schema.safeParse(record);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
    return { ok: false, error: message, status: 400 };
  }

  const nickname = parsed.data.anonymous ? "Anonymous" : parsed.data.nickname || "Anonymous";
  return {
    ok: true,
    data: {
      body: parsed.data.body,
      nickname: sanitizeText(nickname, BREAKROOM_NICKNAME_MAX) || "Anonymous",
      anonymous: parsed.data.anonymous,
    },
  };
}

export function validateReactionBody(body: unknown): ValidationResult<ValidatedReaction> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  if (containsMongoOperators(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }

  const record = body as Record<string, unknown>;
  const unexpected = rejectUnexpectedKeys(record, BREAKROOM_ALLOWED_REACTION_KEYS);
  if (unexpected) return { ok: false, error: unexpected, status: 400 };
  if (honeypotTriggered(record)) {
    return { ok: true, data: { type: "like" }, isHoneypotTriggered: true };
  }

  const schema = z.object({
    type: z.enum(BREAKROOM_REACTION_TYPES, { message: "Invalid reaction type." }),
  });

  const parsed = schema.safeParse(record);
  if (!parsed.success) {
    return { ok: false, error: "Invalid reaction type.", status: 400 };
  }

  return { ok: true, data: parsed.data };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidBreakroomId(value: string): boolean {
  return UUID_PATTERN.test(value) || /^post-[a-z0-9-]+$/i.test(value) || /^comment-[a-z0-9-]+$/i.test(value);
}
