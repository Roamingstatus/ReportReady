import type { Request, Response, NextFunction } from "express";

/** TODO: Replace in-memory buckets with Redis/Upstash for multi-instance deployments. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

export function feedbackRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (bucket.count >= MAX_REQUESTS) {
    res.status(429).json({
      ok: false,
      error: "Too many feedback submissions. Please try again later.",
    });
    return;
  }

  bucket.count += 1;
  next();
}
