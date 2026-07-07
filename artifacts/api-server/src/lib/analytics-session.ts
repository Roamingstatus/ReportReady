import crypto from "node:crypto";
import type { Request, Response } from "express";
import { isAdminPinConfigured, verifyAdminPin } from "./admin-pin.js";
import {
  ADMIN_VERIFIED_COOKIE,
  ADMIN_VERIFIED_SESSION_MS,
  ANALYTICS_GOOGLE_SESSION_MS,
  ANALYTICS_SESSION_COOKIE,
  DEFAULT_ANALYTICS_ADMIN_PATH,
} from "./analytics-constants.js";
import { isEmailAllowed, isGoogleAdminAuthConfigured } from "./google-oauth.js";

function getAnalyticsSecret(): string {
  return process.env.ANALYTICS_SECRET || "dev-analytics-secret";
}

export function getAnalyticsAdminPath(): string {
  const configured = process.env.ANALYTICS_ADMIN_PATH?.trim();
  return configured && configured.startsWith("/") ? configured : DEFAULT_ANALYTICS_ADMIN_PATH;
}

interface GoogleSessionPayload {
  exp: number;
  email: string;
  auth: "google";
}

interface AdminVerifiedPayload {
  exp: number;
  email: string;
  verified: true;
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getAnalyticsSecret()).update(payload).digest("base64url");
}

function verifySignedPayload<T extends { exp: number }>(
  token: string | undefined,
  validate: (decoded: T) => boolean,
): T | null {
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
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
    if (typeof decoded.exp !== "number" || decoded.exp <= Date.now()) return null;
    return validate(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function createGoogleSessionToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + ANALYTICS_GOOGLE_SESSION_MS,
      email: email.trim().toLowerCase(),
      auth: "google",
    } satisfies GoogleSessionPayload),
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function createAdminVerifiedToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + ADMIN_VERIFIED_SESSION_MS,
      email: email.trim().toLowerCase(),
      verified: true,
    } satisfies AdminVerifiedPayload),
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

export function getGoogleSessionFromRequest(req: Request): GoogleSessionPayload | null {
  const cookies = parseCookies(req);
  return verifySignedPayload<GoogleSessionPayload>(cookies[ANALYTICS_SESSION_COOKIE], (decoded) => {
    return typeof decoded.email === "string" && decoded.auth === "google";
  });
}

export function getAdminVerifiedFromRequest(req: Request): AdminVerifiedPayload | null {
  const cookies = parseCookies(req);
  return verifySignedPayload<AdminVerifiedPayload>(cookies[ADMIN_VERIFIED_COOKIE], (decoded) => {
    return typeof decoded.email === "string" && decoded.verified === true;
  });
}

function cookieParts(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function clearCookieParts(name: string): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${name}=`, "HttpOnly", "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function setGoogleSessionCookie(res: Response, token: string): void {
  res.setHeader(
    "Set-Cookie",
    cookieParts(ANALYTICS_SESSION_COOKIE, token, Math.floor(ANALYTICS_GOOGLE_SESSION_MS / 1000)),
  );
}

export function setAdminVerifiedCookie(res: Response, token: string): void {
  res.setHeader(
    "Set-Cookie",
    cookieParts(ADMIN_VERIFIED_COOKIE, token, Math.floor(ADMIN_VERIFIED_SESSION_MS / 1000)),
  );
}

export function clearAllAdminCookies(res: Response): void {
  res.setHeader("Set-Cookie", [clearCookieParts(ANALYTICS_SESSION_COOKIE), clearCookieParts(ADMIN_VERIFIED_COOKIE)]);
}

export function isAdminVerifiedForSession(req: Request, googleSession: GoogleSessionPayload): boolean {
  const verified = getAdminVerifiedFromRequest(req);
  return verified !== null && verified.email === googleSession.email;
}

export interface AdminSessionStatus {
  googleAuthenticated: boolean;
  adminVerified: boolean;
  accessDenied: boolean;
  email?: string;
}

export function getAdminSessionStatus(req: Request): AdminSessionStatus {
  const googleSession = getGoogleSessionFromRequest(req);
  if (!googleSession) {
    return { googleAuthenticated: false, adminVerified: false, accessDenied: false };
  }

  if (!isEmailAllowed(googleSession.email)) {
    return { googleAuthenticated: false, adminVerified: false, accessDenied: true };
  }

  return {
    googleAuthenticated: true,
    adminVerified: isAdminVerifiedForSession(req, googleSession),
    accessDenied: false,
    email: googleSession.email,
  };
}

export function requireFullAdminAccess(req: Request, res: Response): GoogleSessionPayload | null {
  const status = getAdminSessionStatus(req);

  if (status.accessDenied) {
    clearAllAdminCookies(res);
    res.status(403).json({ ok: false, error: "Access denied." });
    return null;
  }

  const googleSession = getGoogleSessionFromRequest(req);
  if (!googleSession || !status.googleAuthenticated) {
    res.status(401).json({ ok: false, error: "Unauthorized.", code: "google_required" });
    return null;
  }

  if (!status.adminVerified) {
    res.status(401).json({ ok: false, error: "Verification required.", code: "pin_required" });
    return null;
  }

  return googleSession;
}

export function isAnalyticsAdminConfigured(): boolean {
  return isGoogleAdminAuthConfigured() && isAdminPinConfigured();
}

export { verifyAdminPin };
