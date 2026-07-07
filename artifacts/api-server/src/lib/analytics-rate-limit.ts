import type { Request, Response, NextFunction } from "express";
import {
  ANALYTICS_EVENT_RATE_MAX,
  ANALYTICS_EVENT_RATE_WINDOW_MS,
  ANALYTICS_LOGIN_RATE_MAX,
  ANALYTICS_LOGIN_RATE_WINDOW_MS,
} from "./analytics-constants.js";
import { getClientIp, hashIp } from "./hash-ip.js";

interface Bucket {
  count: number;
  resetAt: number;
}

const eventBuckets = new Map<string, Bucket>();
const loginBuckets = new Map<string, Bucket>();

function checkRateLimit(
  buckets: Map<string, Bucket>,
  key: string,
  max: number,
  windowMs: number,
): boolean {
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

export function analyticsEventRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ipHash = hashIp(getClientIp(req));
  if (!checkRateLimit(eventBuckets, ipHash, ANALYTICS_EVENT_RATE_MAX, ANALYTICS_EVENT_RATE_WINDOW_MS)) {
    res.status(429).json({ ok: false, error: "Too many events." });
    return;
  }
  next();
}

export function analyticsLoginRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ipHash = hashIp(getClientIp(req));
  if (!checkRateLimit(loginBuckets, `login:${ipHash}`, ANALYTICS_LOGIN_RATE_MAX, ANALYTICS_LOGIN_RATE_WINDOW_MS)) {
    res.status(429).json({ ok: false, error: "Too many attempts. Try again later." });
    return;
  }
  next();
}

export function analyticsPinRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ipHash = hashIp(getClientIp(req));
  if (!checkRateLimit(loginBuckets, `pin:${ipHash}`, ANALYTICS_LOGIN_RATE_MAX, ANALYTICS_LOGIN_RATE_WINDOW_MS)) {
    res.status(429).json({ ok: false, error: "Too many attempts. Try again later." });
    return;
  }
  next();
}
