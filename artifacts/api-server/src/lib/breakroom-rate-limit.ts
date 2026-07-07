import type { Request, Response, NextFunction } from "express";
import { BREAKROOM_RATE_LIMITS } from "./breakroom-constants.js";
import { getClientIp, hashIp } from "./hash-ip.js";
import { requireBreakroomGuest } from "./breakroom-session.js";

/** TODO: Replace in-memory buckets with Redis/Upstash for multi-instance deployments. */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function consume(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) {
    return false;
  }

  bucket.count += 1;
  return true;
}

function rateLimitKey(req: Request, action: string): string {
  const guestId = requireBreakroomGuest(req);
  const ipHash = hashIp(getClientIp(req));
  return `${action}:${guestId ?? "anon"}:${ipHash}`;
}

function createRateLimiter(
  action: string,
  config: { windowMs: number; max: number },
  message = "Too many attempts. Try again later.",
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (consume(rateLimitKey(req, action), config.windowMs, config.max)) {
      next();
      return;
    }
    res.status(429).json({ ok: false, error: message });
  };
}

export const breakroomCreatePostRateLimit = createRateLimiter(
  "create-post",
  BREAKROOM_RATE_LIMITS.createPost,
  "Too many attempts. Try again later.",
);

export const breakroomCreateCommentRateLimit = createRateLimiter(
  "create-comment",
  BREAKROOM_RATE_LIMITS.createComment,
);

export const breakroomReactionRateLimit = createRateLimiter(
  "reaction",
  BREAKROOM_RATE_LIMITS.reaction,
);

export const breakroomMutateRateLimit = createRateLimiter(
  "mutate",
  BREAKROOM_RATE_LIMITS.mutate,
);

export const breakroomReportRateLimit = createRateLimiter(
  "report",
  BREAKROOM_RATE_LIMITS.report,
);
