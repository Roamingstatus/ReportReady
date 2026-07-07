import type { Request, Response, NextFunction } from "express";

function getAllowedOrigins(): string[] {
  const fromEnv = [
    process.env.APP_ORIGIN,
    process.env.PUBLIC_APP_URL,
    process.env.CORS_ORIGIN,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .flatMap((value) => value.split(",").map((part) => part.trim()))
    .filter(Boolean);

  if (fromEnv.length > 0) {
    return [...new Set(fromEnv)];
  }

  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:22838", "http://127.0.0.1:22838", "http://localhost:8080"];
  }

  return [];
}

function originMatchesAllowed(origin: string, allowed: string): boolean {
  try {
    const originUrl = new URL(origin);
    const allowedUrl = new URL(allowed);
    return originUrl.origin === allowedUrl.origin;
  } catch {
    return origin === allowed;
  }
}

export function isSameOriginRequest(req: Request): boolean {
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) {
    return false;
  }

  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  if (origin && allowedOrigins.some((allowed) => originMatchesAllowed(origin, allowed))) {
    return true;
  }

  const referer = typeof req.headers.referer === "string" ? req.headers.referer : "";
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return allowedOrigins.some((allowed) => originMatchesAllowed(refererOrigin, allowed));
    } catch {
      return false;
    }
  }

  return false;
}

export function requireBreakroomMutationOrigin(req: Request, res: Response, next: NextFunction): void {
  if (isSameOriginRequest(req)) {
    next();
    return;
  }

  res.status(403).json({ ok: false, error: "Request origin is not allowed." });
}
