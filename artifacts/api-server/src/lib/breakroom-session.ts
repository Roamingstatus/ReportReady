import crypto from "node:crypto";
import type { Request, Response } from "express";
import { BREAKROOM_SESSION_COOKIE, BREAKROOM_SESSION_MS } from "./breakroom-constants.js";

interface BreakroomSessionPayload {
  guestId: string;
  csrf: string;
  exp: number;
}

function getBreakroomSecret(): string {
  return process.env.BREAKROOM_SECRET || process.env.ANALYTICS_SECRET || "dev-breakroom-secret";
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getBreakroomSecret()).update(payload).digest("base64url");
}

function verifySignedPayload(token: string | undefined): BreakroomSessionPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const provided = Buffer.from(signature);
  const target = Buffer.from(expected);
  if (provided.length !== target.length || !crypto.timingSafeEqual(provided, target)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as BreakroomSessionPayload;
    if (
      typeof decoded.guestId !== "string" ||
      typeof decoded.csrf !== "string" ||
      typeof decoded.exp !== "number" ||
      decoded.exp <= Date.now()
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function createSessionToken(guestId: string, csrf: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      guestId,
      csrf,
      exp: Date.now() + BREAKROOM_SESSION_MS,
    } satisfies BreakroomSessionPayload),
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function cookieParts(value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${BREAKROOM_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function issueBreakroomSession(res: Response): { guestId: string; csrfToken: string } {
  const guestId = crypto.randomUUID();
  const csrfToken = crypto.randomBytes(24).toString("base64url");
  const token = createSessionToken(guestId, csrfToken);
  res.setHeader(
    "Set-Cookie",
    cookieParts(token, Math.floor(BREAKROOM_SESSION_MS / 1000)),
  );
  return { guestId, csrfToken };
}

export function getBreakroomSession(req: Request): BreakroomSessionPayload | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === BREAKROOM_SESSION_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      return verifySignedPayload(value);
    }
  }

  return null;
}

export function ensureBreakroomSession(
  req: Request,
  res: Response,
): { guestId: string; csrfToken: string } {
  const existing = getBreakroomSession(req);
  if (existing) {
    return { guestId: existing.guestId, csrfToken: existing.csrf };
  }
  return issueBreakroomSession(res);
}

export function verifyBreakroomCsrf(req: Request): boolean {
  const session = getBreakroomSession(req);
  if (!session) return false;
  const header = req.headers["x-csrf-token"];
  if (typeof header !== "string" || header.length === 0) return false;
  const provided = Buffer.from(header);
  const expected = Buffer.from(session.csrf);
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

export function requireBreakroomGuest(req: Request): string | null {
  return getBreakroomSession(req)?.guestId ?? null;
}
