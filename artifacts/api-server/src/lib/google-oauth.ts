import crypto from "node:crypto";
import type { Request } from "express";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const OAUTH_STATE_MS = 10 * 60 * 1000;

function getAnalyticsSecret(): string {
  return process.env.ANALYTICS_SECRET || "dev-analytics-secret";
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getAnalyticsSecret()).update(payload).digest("base64url");
}

export function getGoogleClientId(): string | null {
  const value = process.env.GOOGLE_CLIENT_ID?.trim();
  return value || null;
}

export function getGoogleClientSecret(): string | null {
  const value = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return value || null;
}

export function getOwnerAdminEmail(): string | null {
  const email = process.env.ONLY_ADMIN_ALLOWED_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function isEmailAllowed(email: string): boolean {
  const ownerEmail = getOwnerAdminEmail();
  const normalized = email.trim().toLowerCase();
  if (!ownerEmail || !normalized) return false;
  return normalized === ownerEmail;
}

export function isGoogleAdminAuthConfigured(): boolean {
  return Boolean(getGoogleClientId() && getGoogleClientSecret() && getOwnerAdminEmail());
}

export function getPublicAppOrigin(req: Request): string {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol || "http";
  const host = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
  if (!host) {
    throw new Error("Unable to determine public app origin.");
  }
  return `${proto}://${host}`;
}

export function getGoogleRedirectUri(req: Request): string {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return `${getPublicAppOrigin(req)}/api/analytics/admin/google/callback`;
}

export function createOAuthState(): string {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + OAUTH_STATE_MS,
      nonce: crypto.randomUUID(),
    }),
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifyOAuthState(state: string | undefined): boolean {
  if (!state) return false;
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;

  const expected = signPayload(payload);
  const provided = Buffer.from(signature);
  const target = Buffer.from(expected);
  if (provided.length !== target.length || !crypto.timingSafeEqual(provided, target)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };
    return typeof decoded.exp === "number" && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

export function buildGoogleAuthUrl(req: Request): string {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("Google OAuth is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: createOAuthState(),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleUserInfo {
  email?: string;
  verified_email?: boolean;
}

export async function exchangeGoogleCode(
  req: Request,
  code: string,
): Promise<{ email: string } | null> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) return null;

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(req),
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("[analytics] google token exchange failed", {
      status: tokenResponse.status,
      error: tokenData.error ?? "unknown",
    });
    return null;
  }

  const userResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const userData = (await userResponse.json()) as GoogleUserInfo;
  if (!userResponse.ok || !userData.email || userData.verified_email !== true) {
    console.error("[analytics] google userinfo failed", {
      status: userResponse.status,
      hasEmail: Boolean(userData.email),
      verified: userData.verified_email,
    });
    return null;
  }

  return { email: userData.email.trim().toLowerCase() };
}
