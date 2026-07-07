// src/app.ts
import cors from "cors";
import express from "express";

// src/lib/security-headers.ts
function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  );
  next();
}

// src/routes/index.ts
import { Router as Router8 } from "express";

// src/routes/analytics-admin.ts
import { Router } from "express";

// src/lib/analytics-constants.ts
var DEFAULT_ANALYTICS_ADMIN_PATH = "/garden-room-9274";
var ANALYTICS_EVENT_NAME_MAX_LENGTH = 80;
var ANALYTICS_METADATA_MAX_BYTES = 5 * 1024;
var ANALYTICS_SESSION_COOKIE = "rr_analytics_session";
var ADMIN_VERIFIED_COOKIE = "reportready_admin_verified";
var ANALYTICS_GOOGLE_SESSION_MS = 20 * 60 * 1e3;
var ADMIN_VERIFIED_SESSION_MS = 45 * 60 * 1e3;
var ANALYTICS_EVENT_RATE_WINDOW_MS = 60 * 60 * 1e3;
var ANALYTICS_EVENT_RATE_MAX = 200;
var ANALYTICS_LOGIN_RATE_WINDOW_MS = 15 * 60 * 1e3;
var ANALYTICS_LOGIN_RATE_MAX = 5;
var ALLOWED_ANALYTICS_EVENTS = /* @__PURE__ */ new Set([
  "page_view",
  "template_view",
  "print_click",
  "feedback_open",
  "feedback_submit",
  "buy_me_coffee_click",
  "credanta_promo_click",
  "nexusgarden_link_click",
  "coming_soon_preview_click",
  "breakroom_visit",
  "breakroom_post_created",
  "breakroom_reaction",
  "sheet_edit_click"
]);
var ANALYTICS_RANGES = /* @__PURE__ */ new Set(["today", "7d", "30d", "all"]);

// src/lib/hash-ip.ts
import crypto from "node:crypto";
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}
function hashIp(ip) {
  const secret = process.env.ANALYTICS_SECRET || "dev-analytics-secret";
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

// src/lib/analytics-rate-limit.ts
var eventBuckets = /* @__PURE__ */ new Map();
var loginBuckets = /* @__PURE__ */ new Map();
function checkRateLimit(buckets3, key, max, windowMs) {
  const now = Date.now();
  const bucket = buckets3.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets3.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) {
    return false;
  }
  bucket.count += 1;
  return true;
}
function analyticsEventRateLimit(req, res, next) {
  const ipHash = hashIp(getClientIp(req));
  if (!checkRateLimit(eventBuckets, ipHash, ANALYTICS_EVENT_RATE_MAX, ANALYTICS_EVENT_RATE_WINDOW_MS)) {
    res.status(429).json({ ok: false, error: "Too many events." });
    return;
  }
  next();
}
function analyticsLoginRateLimit(req, res, next) {
  const ipHash = hashIp(getClientIp(req));
  if (!checkRateLimit(loginBuckets, `login:${ipHash}`, ANALYTICS_LOGIN_RATE_MAX, ANALYTICS_LOGIN_RATE_WINDOW_MS)) {
    res.status(429).json({ ok: false, error: "Too many attempts. Try again later." });
    return;
  }
  next();
}
function analyticsPinRateLimit(req, res, next) {
  const ipHash = hashIp(getClientIp(req));
  if (!checkRateLimit(loginBuckets, `pin:${ipHash}`, ANALYTICS_LOGIN_RATE_MAX, ANALYTICS_LOGIN_RATE_WINDOW_MS)) {
    res.status(429).json({ ok: false, error: "Too many attempts. Try again later." });
    return;
  }
  next();
}

// src/lib/analytics-session.ts
import crypto4 from "node:crypto";

// src/lib/admin-pin.ts
import crypto2 from "node:crypto";
function getAdminAccessPin() {
  const pin = process.env.ADMIN_ACCESS_PIN?.trim();
  return pin && pin.length > 0 ? pin : null;
}
function isAdminPinConfigured() {
  return Boolean(getAdminAccessPin());
}
function verifyAdminPin(pin) {
  const expected = getAdminAccessPin();
  if (!expected || !pin) return false;
  const provided = Buffer.from(pin.trim());
  const target = Buffer.from(expected);
  if (provided.length !== target.length) return false;
  return crypto2.timingSafeEqual(provided, target);
}

// src/lib/google-oauth.ts
import crypto3 from "node:crypto";
var GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
var OAUTH_STATE_MS = 10 * 60 * 1e3;
function getAnalyticsSecret() {
  return process.env.ANALYTICS_SECRET || "dev-analytics-secret";
}
function signPayload(payload) {
  return crypto3.createHmac("sha256", getAnalyticsSecret()).update(payload).digest("base64url");
}
function getGoogleClientId() {
  const value = process.env.GOOGLE_CLIENT_ID?.trim();
  return value || null;
}
function getGoogleClientSecret() {
  const value = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return value || null;
}
function getOwnerAdminEmail() {
  const email = process.env.ONLY_ADMIN_ALLOWED_EMAIL?.trim().toLowerCase();
  return email || null;
}
function isEmailAllowed(email) {
  const ownerEmail = getOwnerAdminEmail();
  const normalized = email.trim().toLowerCase();
  if (!ownerEmail || !normalized) return false;
  return normalized === ownerEmail;
}
function isGoogleAdminAuthConfigured() {
  return Boolean(getGoogleClientId() && getGoogleClientSecret() && getOwnerAdminEmail());
}
function getPublicAppOrigin(req) {
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
function getGoogleRedirectUri(req) {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return `${getPublicAppOrigin(req)}/api/analytics/admin/google/callback`;
}
function createOAuthState() {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + OAUTH_STATE_MS,
      nonce: crypto3.randomUUID()
    })
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}
function verifyOAuthState(state) {
  if (!state) return false;
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;
  const expected = signPayload(payload);
  const provided = Buffer.from(signature);
  const target = Buffer.from(expected);
  if (provided.length !== target.length || !crypto3.timingSafeEqual(provided, target)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof decoded.exp === "number" && decoded.exp > Date.now();
  } catch {
    return false;
  }
}
function buildGoogleAuthUrl(req) {
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
    state: createOAuthState()
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}
async function exchangeGoogleCode(req, code) {
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
      grant_type: "authorization_code"
    })
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("[analytics] google token exchange failed", {
      status: tokenResponse.status,
      error: tokenData.error ?? "unknown"
    });
    return null;
  }
  const userResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const userData = await userResponse.json();
  if (!userResponse.ok || !userData.email || userData.verified_email !== true) {
    console.error("[analytics] google userinfo failed", {
      status: userResponse.status,
      hasEmail: Boolean(userData.email),
      verified: userData.verified_email
    });
    return null;
  }
  return { email: userData.email.trim().toLowerCase() };
}

// src/lib/analytics-session.ts
function getAnalyticsSecret2() {
  return process.env.ANALYTICS_SECRET || "dev-analytics-secret";
}
function getAnalyticsAdminPath() {
  const configured = process.env.ANALYTICS_ADMIN_PATH?.trim();
  return configured && configured.startsWith("/") ? configured : DEFAULT_ANALYTICS_ADMIN_PATH;
}
function signPayload2(payload) {
  return crypto4.createHmac("sha256", getAnalyticsSecret2()).update(payload).digest("base64url");
}
function verifySignedPayload(token, validate) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = signPayload2(payload);
  const provided = Buffer.from(signature);
  const target = Buffer.from(expected);
  if (provided.length !== target.length || !crypto4.timingSafeEqual(provided, target)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.exp !== "number" || decoded.exp <= Date.now()) return null;
    return validate(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
function createGoogleSessionToken(email) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + ANALYTICS_GOOGLE_SESSION_MS,
      email: email.trim().toLowerCase(),
      auth: "google"
    })
  ).toString("base64url");
  return `${payload}.${signPayload2(payload)}`;
}
function createAdminVerifiedToken(email) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + ADMIN_VERIFIED_SESSION_MS,
      email: email.trim().toLowerCase(),
      verified: true
    })
  ).toString("base64url");
  return `${payload}.${signPayload2(payload)}`;
}
function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}
function getGoogleSessionFromRequest(req) {
  const cookies = parseCookies(req);
  return verifySignedPayload(cookies[ANALYTICS_SESSION_COOKIE], (decoded) => {
    return typeof decoded.email === "string" && decoded.auth === "google";
  });
}
function getAdminVerifiedFromRequest(req) {
  const cookies = parseCookies(req);
  return verifySignedPayload(cookies[ADMIN_VERIFIED_COOKIE], (decoded) => {
    return typeof decoded.email === "string" && decoded.verified === true;
  });
}
function cookieParts(name, value, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax"
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
function clearCookieParts(name) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${name}=`, "HttpOnly", "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
function setGoogleSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    cookieParts(ANALYTICS_SESSION_COOKIE, token, Math.floor(ANALYTICS_GOOGLE_SESSION_MS / 1e3))
  );
}
function setAdminVerifiedCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    cookieParts(ADMIN_VERIFIED_COOKIE, token, Math.floor(ADMIN_VERIFIED_SESSION_MS / 1e3))
  );
}
function clearAllAdminCookies(res) {
  res.setHeader("Set-Cookie", [clearCookieParts(ANALYTICS_SESSION_COOKIE), clearCookieParts(ADMIN_VERIFIED_COOKIE)]);
}
function isAdminVerifiedForSession(req, googleSession) {
  const verified = getAdminVerifiedFromRequest(req);
  return verified !== null && verified.email === googleSession.email;
}
function getAdminSessionStatus(req) {
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
    email: googleSession.email
  };
}
function requireFullAdminAccess(req, res) {
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
function isAnalyticsAdminConfigured() {
  return isGoogleAdminAuthConfigured() && isAdminPinConfigured();
}

// src/lib/analytics-stats.ts
function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function filterByRange(events, range) {
  if (range === "all") return events;
  const now = /* @__PURE__ */ new Date();
  let cutoff;
  if (range === "today") {
    cutoff = startOfUtcDay(now);
  } else if (range === "7d") {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
  } else {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
  }
  return events.filter((event) => new Date(event.createdAt) >= cutoff);
}
function countEvents(events, eventName) {
  return events.filter((event) => event.eventName === eventName).length;
}
function uniqueGuests(events) {
  return new Set(events.map((event) => event.guestId)).size;
}
function topTemplates(events, eventName, limit = 10) {
  const counts = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.eventName !== eventName) continue;
    const templateId = typeof event.metadata.templateId === "string" ? event.metadata.templateId : typeof event.metadata.template_id === "string" ? event.metadata.template_id : "unknown";
    counts.set(templateId, (counts.get(templateId) ?? 0) + 1);
  }
  return [...counts.entries()].map(([templateId, count]) => ({ templateId, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}
function trafficByPage(events, limit = 12) {
  const counts = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.eventName !== "page_view") continue;
    const pagePath = event.path || "/";
    counts.set(pagePath, (counts.get(pagePath) ?? 0) + 1);
  }
  return [...counts.entries()].map(([path4, count]) => ({ path: path4, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}
function buildGuestVisitors(events, limit = 100) {
  const byGuest = /* @__PURE__ */ new Map();
  const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const event of sorted) {
    const existing = byGuest.get(event.guestId);
    const pagePath = event.path || "/";
    if (!existing) {
      byGuest.set(event.guestId, {
        firstSeen: event.createdAt,
        lastSeen: event.createdAt,
        visitCount: event.eventName === "page_view" ? 1 : 0,
        deviceType: event.deviceType || "unknown",
        browserFamily: event.browserFamily || "unknown",
        pathsByRecency: event.eventName === "page_view" ? [pagePath] : []
      });
      continue;
    }
    existing.lastSeen = event.createdAt;
    existing.deviceType = event.deviceType || existing.deviceType;
    existing.browserFamily = event.browserFamily || existing.browserFamily;
    if (event.eventName === "page_view") {
      existing.visitCount += 1;
      existing.pathsByRecency = [
        pagePath,
        ...existing.pathsByRecency.filter((p) => p !== pagePath)
      ].slice(0, 5);
    }
  }
  return [...byGuest.entries()].map(([guestId, acc]) => ({
    guestId,
    firstSeen: acc.firstSeen,
    lastSeen: acc.lastSeen,
    visitCount: acc.visitCount,
    deviceType: acc.deviceType,
    browserFamily: acc.browserFamily,
    recentPaths: acc.pathsByRecency
  })).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, limit);
}
function buildAnalyticsDashboard(events, range) {
  const filtered = filterByRange(events, range);
  const todayStart = startOfUtcDay(/* @__PURE__ */ new Date());
  const todayEvents = events.filter((event) => new Date(event.createdAt) >= todayStart);
  return {
    range,
    cards: {
      totalVisits: countEvents(filtered, "page_view"),
      uniqueGuests: uniqueGuests(filtered),
      visitsToday: countEvents(todayEvents, "page_view"),
      templateViews: countEvents(filtered, "template_view"),
      printClicks: countEvents(filtered, "print_click"),
      feedbackOpens: countEvents(filtered, "feedback_open"),
      feedbackSubmissions: countEvents(filtered, "feedback_submit"),
      buyMeCoffeeClicks: countEvents(filtered, "buy_me_coffee_click"),
      credantaClicks: countEvents(filtered, "credanta_promo_click"),
      comingSoonClicks: countEvents(filtered, "coming_soon_preview_click"),
      breakroomVisits: countEvents(filtered, "breakroom_visit")
    },
    topTemplatesViewed: topTemplates(filtered, "template_view"),
    topPrintedTemplates: topTemplates(filtered, "print_click"),
    recentEvents: [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50),
    trafficByPage: trafficByPage(filtered),
    guestVisitors: buildGuestVisitors(filtered)
  };
}

// src/lib/analytics-storage.ts
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
var moduleDir = path.dirname(fileURLToPath(import.meta.url));
function getAnalyticsFilePath() {
  if (process.env.ANALYTICS_DATA_FILE) {
    return process.env.ANALYTICS_DATA_FILE;
  }
  const repoRoot = path.resolve(moduleDir, "..", "..", "..");
  return path.join(repoRoot, "data", "analytics-events.jsonl");
}
async function appendAnalyticsEvent(input) {
  const record = {
    id: randomUUID(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...input
  };
  const filePath = getAnalyticsFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(record)}
`, "utf8");
  return record;
}
async function readAnalyticsEvents() {
  const filePath = getAnalyticsFilePath();
  try {
    const raw = await readFile(filePath, "utf8");
    if (!raw.trim()) return [];
    const events = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed));
      } catch {
      }
    }
    return events;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

// src/lib/sanitize.ts
var SCRIPT_TAG_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
var HTML_TAG_PATTERN = /<[^>]*>/g;
var CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
function sanitizeText(value, maxLength = 2e3) {
  return value.replace(CONTROL_CHARS_PATTERN, "").replace(SCRIPT_TAG_PATTERN, "").replace(HTML_TAG_PATTERN, "").trim().slice(0, maxLength);
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// src/routes/analytics-admin.ts
var router = Router();
function parseRange(value) {
  const range = typeof value === "string" ? value : "7d";
  return ANALYTICS_RANGES.has(range) ? range : "7d";
}
function redirectToAdminPath(res, error) {
  const adminPath = getAnalyticsAdminPath();
  const url = error ? `${adminPath}?error=${encodeURIComponent(error)}` : adminPath;
  res.redirect(302, url);
}
function redirectToHomepage(res) {
  res.redirect(302, "/");
}
router.get("/analytics/admin/config", (_req, res) => {
  res.status(200).json({
    ok: true,
    adminPath: getAnalyticsAdminPath(),
    configured: isAnalyticsAdminConfigured(),
    authMethod: "google_pin"
  });
});
router.get("/analytics/admin/session", (req, res) => {
  const status = getAdminSessionStatus(req);
  if (status.accessDenied) {
    clearAllAdminCookies(res);
    res.status(403).json({
      ok: false,
      googleAuthenticated: false,
      adminVerified: false,
      accessDenied: true
    });
    return;
  }
  if (!status.googleAuthenticated) {
    res.status(401).json({
      ok: false,
      googleAuthenticated: false,
      adminVerified: false,
      accessDenied: false
    });
    return;
  }
  res.status(200).json({
    ok: status.adminVerified,
    googleAuthenticated: true,
    adminVerified: status.adminVerified,
    accessDenied: false,
    email: status.email
  });
});
router.get("/analytics/admin/google/start", analyticsLoginRateLimit, (req, res) => {
  if (!isAnalyticsAdminConfigured()) {
    redirectToHomepage(res);
    return;
  }
  try {
    const authUrl = buildGoogleAuthUrl(req);
    res.redirect(302, authUrl);
  } catch (error) {
    console.error("[analytics] google auth start failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    redirectToHomepage(res);
  }
});
router.get("/analytics/admin/google/callback", analyticsLoginRateLimit, async (req, res) => {
  if (!isAnalyticsAdminConfigured()) {
    redirectToHomepage(res);
    return;
  }
  const oauthError = typeof req.query.error === "string" ? req.query.error : null;
  if (oauthError) {
    console.info("[analytics] admin login failure", {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      reason: "oauth_denied"
    });
    redirectToHomepage(res);
    return;
  }
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !verifyOAuthState(state)) {
    console.info("[analytics] admin login failure", {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      reason: "oauth_state_invalid"
    });
    redirectToHomepage(res);
    return;
  }
  try {
    const googleUser = await exchangeGoogleCode(req, code);
    if (!googleUser) {
      console.info("[analytics] admin login failure", {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        reason: "oauth_failed"
      });
      redirectToHomepage(res);
      return;
    }
    if (!isEmailAllowed(googleUser.email)) {
      console.info("[analytics] admin login failure", {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        reason: "email_mismatch"
      });
      clearAllAdminCookies(res);
      redirectToHomepage(res);
      return;
    }
    const token = createGoogleSessionToken(googleUser.email);
    setGoogleSessionCookie(res, token);
    console.info("[analytics] admin login success", {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      reason: "google_authenticated"
    });
    redirectToAdminPath(res);
  } catch (callbackError) {
    console.error("[analytics] google callback failed", {
      reason: callbackError instanceof Error ? callbackError.message : "unknown"
    });
    redirectToHomepage(res);
  }
});
router.post("/analytics/admin/verify-pin", analyticsPinRateLimit, (req, res) => {
  const googleSession = getGoogleSessionFromRequest(req);
  if (!googleSession || !isEmailAllowed(googleSession.email)) {
    clearAllAdminCookies(res);
    res.status(403).json({ ok: false, error: "Access denied." });
    return;
  }
  const pin = sanitizeText(typeof req.body?.pin === "string" ? req.body.pin : "", 32);
  if (!verifyAdminPin(pin)) {
    console.info("[analytics] admin login failure", {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      reason: "pin_failed"
    });
    res.status(401).json({ ok: false, error: "Invalid code" });
    return;
  }
  const verifiedToken = createAdminVerifiedToken(googleSession.email);
  setAdminVerifiedCookie(res, verifiedToken);
  console.info("[analytics] admin login success", {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    reason: "pin_success"
  });
  res.status(200).json({ ok: true, adminVerified: true });
});
router.post("/analytics/admin/logout", (_req, res) => {
  clearAllAdminCookies(res);
  res.status(200).json({ ok: true });
});
router.get("/analytics/admin/dashboard", async (req, res) => {
  if (!requireFullAdminAccess(req, res)) return;
  const range = parseRange(req.query.range);
  try {
    const events = await readAnalyticsEvents();
    const dashboard = buildAnalyticsDashboard(events, range);
    res.status(200).json({ ok: true, dashboard });
  } catch (error) {
    console.error("[analytics] dashboard failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Dashboard unavailable." });
  }
});
var analytics_admin_default = router;

// src/routes/analytics.ts
import { Router as Router2 } from "express";

// src/lib/analytics-user-agent.ts
function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();
  if (!ua || ua === "unknown") return "unknown";
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}
function getBrowserFamily(userAgent) {
  const ua = userAgent;
  if (!ua || ua === "unknown") return "unknown";
  if (/Edg\//.test(ua)) return "edge";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

// src/lib/analytics-validation.ts
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sanitizeString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}
function validateAnalyticsEventBody(body) {
  if (!isPlainObject(body)) {
    return { ok: false, status: 400, error: "Invalid request body." };
  }
  const guestId = sanitizeString(body.guestId, 64);
  if (!UUID_RE.test(guestId)) {
    return { ok: false, status: 400, error: "Invalid guest id." };
  }
  const eventName = sanitizeString(body.eventName, ANALYTICS_EVENT_NAME_MAX_LENGTH);
  if (!eventName) {
    return { ok: false, status: 400, error: "Event name is required." };
  }
  if (!ALLOWED_ANALYTICS_EVENTS.has(eventName)) {
    return { ok: false, status: 400, error: "Invalid event name." };
  }
  let metadata = {};
  if (body.metadata !== void 0) {
    if (!isPlainObject(body.metadata)) {
      return { ok: false, status: 400, error: "Invalid metadata." };
    }
    metadata = body.metadata;
    const metadataBytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
    if (metadataBytes > ANALYTICS_METADATA_MAX_BYTES) {
      return { ok: false, status: 400, error: "Metadata payload too large." };
    }
  }
  const pathValue = sanitizeString(body.path ?? metadata.path, 500);
  const referrer = sanitizeString(body.referrer ?? metadata.referrer, 500);
  return {
    ok: true,
    data: {
      guestId,
      eventName,
      metadata,
      path: pathValue,
      referrer
    }
  };
}

// src/routes/analytics.ts
var router2 = Router2();
router2.all("/analytics/event", (req, res, next) => {
  if (req.method === "POST") {
    next();
    return;
  }
  res.set("Allow", "POST");
  res.status(405).json({ ok: false, error: "Method not allowed." });
});
router2.post("/analytics/event", analyticsEventRateLimit, async (req, res) => {
  const validation = validateAnalyticsEventBody(req.body);
  if (!validation.ok) {
    res.status(validation.status).json({ ok: false, error: validation.error });
    return;
  }
  const { data } = validation;
  const userAgent = sanitizeText(req.get("user-agent") ?? "unknown", 500);
  try {
    await appendAnalyticsEvent({
      guestId: data.guestId,
      eventName: data.eventName,
      metadata: data.metadata,
      path: data.path || "",
      referrer: data.referrer,
      userAgent,
      deviceType: getDeviceType(userAgent),
      browserFamily: getBrowserFamily(userAgent)
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[analytics] event store failed", {
      eventName: data.eventName,
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Event could not be recorded." });
  }
});
var analytics_default = router2;

// src/routes/breakroom-admin.ts
import { Router as Router3 } from "express";

// src/lib/breakroom-moderation-reasons.ts
var BREAKROOM_MODERATION_REASONS = [
  "Offensive content",
  "Spam",
  "PHI/privacy concern",
  "Harassment",
  "Unnecessary/off-topic",
  "Duplicate",
  "Other"
];
var BREAKROOM_MODERATION_DEFAULT_REASON = "Offensive content";
function normalizeModerationReason(value) {
  if (typeof value !== "string" || !value.trim()) {
    return BREAKROOM_MODERATION_DEFAULT_REASON;
  }
  const trimmed = value.trim();
  if (BREAKROOM_MODERATION_REASONS.includes(trimmed)) {
    return trimmed;
  }
  return trimmed.slice(0, 200);
}

// src/lib/breakroom-origin.ts
function getAllowedOrigins() {
  const fromEnv = [
    process.env.APP_ORIGIN,
    process.env.PUBLIC_APP_URL,
    process.env.CORS_ORIGIN
  ].filter((value) => typeof value === "string" && value.trim().length > 0).flatMap((value) => value.split(",").map((part) => part.trim())).filter(Boolean);
  if (fromEnv.length > 0) {
    return [...new Set(fromEnv)];
  }
  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:22838", "http://127.0.0.1:22838", "http://localhost:8080"];
  }
  return [];
}
function originMatchesAllowed(origin, allowed) {
  try {
    const originUrl = new URL(origin);
    const allowedUrl = new URL(allowed);
    return originUrl.origin === allowedUrl.origin;
  } catch {
    return origin === allowed;
  }
}
function isSameOriginRequest(req) {
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
function requireBreakroomMutationOrigin(req, res, next) {
  if (isSameOriginRequest(req)) {
    next();
    return;
  }
  res.status(403).json({ ok: false, error: "Request origin is not allowed." });
}

// src/lib/breakroom-constants.ts
var BREAKROOM_SESSION_COOKIE = "rr_breakroom_session";
var BREAKROOM_SESSION_MS = 30 * 24 * 60 * 60 * 1e3;
var BREAKROOM_POST_TITLE_MAX = 120;
var BREAKROOM_POST_BODY_MIN = 2;
var BREAKROOM_POST_BODY_MAX = 3e3;
var BREAKROOM_COMMENT_BODY_MIN = 1;
var BREAKROOM_COMMENT_BODY_MAX = 1e3;
var BREAKROOM_NICKNAME_MAX = 40;
var BREAKROOM_REPORT_AUTO_HIDE_THRESHOLD = 5;
var BREAKROOM_REACTION_TYPES = ["like", "laugh", "support", "coffee"];
var BREAKROOM_RATE_LIMITS = {
  createPost: { windowMs: 15 * 60 * 1e3, max: 5 },
  createComment: { windowMs: 15 * 60 * 1e3, max: 20 },
  reaction: { windowMs: 15 * 60 * 1e3, max: 60 },
  mutate: { windowMs: 15 * 60 * 1e3, max: 20 },
  report: { windowMs: 15 * 60 * 1e3, max: 10 }
};
var BREAKROOM_ALLOWED_POST_KEYS = /* @__PURE__ */ new Set([
  "title",
  "body",
  "nickname",
  "anonymous",
  "companyWebsite"
]);
var BREAKROOM_ALLOWED_COMMENT_KEYS = /* @__PURE__ */ new Set([
  "body",
  "nickname",
  "anonymous",
  "companyWebsite"
]);
var BREAKROOM_ALLOWED_EDIT_POST_KEYS = /* @__PURE__ */ new Set([
  "title",
  "body",
  "companyWebsite"
]);
var BREAKROOM_ALLOWED_REACTION_KEYS = /* @__PURE__ */ new Set(["type", "companyWebsite"]);
var BREAKROOM_PENDING_REVIEW_POST_MESSAGE = "Your post needs review before it can appear.";
var BREAKROOM_PENDING_REVIEW_COMMENT_MESSAGE = "Your comment needs review before it can appear.";
var OPENAI_MODERATION_MODEL = "omni-moderation-latest";

// src/lib/breakroom-session.ts
import crypto5 from "node:crypto";
function getBreakroomSecret() {
  return process.env.BREAKROOM_SECRET || process.env.ANALYTICS_SECRET || "dev-breakroom-secret";
}
function signPayload3(payload) {
  return crypto5.createHmac("sha256", getBreakroomSecret()).update(payload).digest("base64url");
}
function verifySignedPayload2(token) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = signPayload3(payload);
  const provided = Buffer.from(signature);
  const target = Buffer.from(expected);
  if (provided.length !== target.length || !crypto5.timingSafeEqual(provided, target)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.guestId !== "string" || typeof decoded.csrf !== "string" || typeof decoded.exp !== "number" || decoded.exp <= Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
function createSessionToken(guestId, csrf) {
  const payload = Buffer.from(
    JSON.stringify({
      guestId,
      csrf,
      exp: Date.now() + BREAKROOM_SESSION_MS
    })
  ).toString("base64url");
  return `${payload}.${signPayload3(payload)}`;
}
function cookieParts2(value, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${BREAKROOM_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}
function issueBreakroomSession(res) {
  const guestId = crypto5.randomUUID();
  const csrfToken = crypto5.randomBytes(24).toString("base64url");
  const token = createSessionToken(guestId, csrfToken);
  res.setHeader(
    "Set-Cookie",
    cookieParts2(token, Math.floor(BREAKROOM_SESSION_MS / 1e3))
  );
  return { guestId, csrfToken };
}
function getBreakroomSession(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === BREAKROOM_SESSION_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      return verifySignedPayload2(value);
    }
  }
  return null;
}
function ensureBreakroomSession(req, res) {
  const existing = getBreakroomSession(req);
  if (existing) {
    return { guestId: existing.guestId, csrfToken: existing.csrf };
  }
  return issueBreakroomSession(res);
}
function verifyBreakroomCsrf(req) {
  const session = getBreakroomSession(req);
  if (!session) return false;
  const header = req.headers["x-csrf-token"];
  if (typeof header !== "string" || header.length === 0) return false;
  const provided = Buffer.from(header);
  const expected = Buffer.from(session.csrf);
  if (provided.length !== expected.length) return false;
  return crypto5.timingSafeEqual(provided, expected);
}
function requireBreakroomGuest(req) {
  return getBreakroomSession(req)?.guestId ?? null;
}

// src/lib/breakroom-rate-limit.ts
var buckets = /* @__PURE__ */ new Map();
function consume(key, windowMs, max) {
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
function rateLimitKey(req, action) {
  const guestId = requireBreakroomGuest(req);
  const ipHash = hashIp(getClientIp(req));
  return `${action}:${guestId ?? "anon"}:${ipHash}`;
}
function createRateLimiter(action, config, message = "Too many attempts. Try again later.") {
  return (req, res, next) => {
    if (consume(rateLimitKey(req, action), config.windowMs, config.max)) {
      next();
      return;
    }
    res.status(429).json({ ok: false, error: message });
  };
}
var breakroomCreatePostRateLimit = createRateLimiter(
  "create-post",
  BREAKROOM_RATE_LIMITS.createPost,
  "Too many attempts. Try again later."
);
var breakroomCreateCommentRateLimit = createRateLimiter(
  "create-comment",
  BREAKROOM_RATE_LIMITS.createComment
);
var breakroomReactionRateLimit = createRateLimiter(
  "reaction",
  BREAKROOM_RATE_LIMITS.reaction
);
var breakroomMutateRateLimit = createRateLimiter(
  "mutate",
  BREAKROOM_RATE_LIMITS.mutate
);
var breakroomReportRateLimit = createRateLimiter(
  "report",
  BREAKROOM_RATE_LIMITS.report
);

// src/lib/breakroom-storage.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import { mkdir as mkdir2, readFile as readFile2, writeFile } from "node:fs/promises";
import path2 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// src/lib/moderation/openai-moderation.ts
function getOpenAIApiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}
async function moderateTextWithOpenAI(text) {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    console.warn("[moderation] OPENAI_API_KEY is not set; skipping OpenAI moderation.");
    return null;
  }
  if (!text.trim()) {
    return {
      flagged: false,
      categories: {},
      categoryScores: {}
    };
  }
  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODERATION_MODEL,
        input: text
      })
    });
    if (!response.ok) {
      console.error("[moderation] OpenAI moderation request failed", {
        status: response.status
      });
      return null;
    }
    const data = await response.json();
    const result = data.results?.[0];
    if (!result) {
      console.error("[moderation] OpenAI moderation returned no results.");
      return null;
    }
    return {
      flagged: Boolean(result.flagged),
      categories: result.categories ?? {},
      categoryScores: result.category_scores ?? {}
    };
  } catch (error) {
    console.error("[moderation] OpenAI moderation error", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}

// src/lib/moderation/phi-keywords.ts
var PHI_REJECTION_MESSAGE = "Please do not share patient names, MRNs, dates of birth, room numbers, or protected health information.";
var PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\bmrn\s*[:#]?\s*\d+/i,
  /\bmedical record (?:number|#|no\.?)/i,
  /\bdate of birth\b/i,
  /\bdob\s*[:/]\s*\d{1,2}/i,
  /\bpatient\s+name\s*[:/]/i,
  /\b(?:room|rm)\s*#?\s*\d{1,4}\b/i,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b.*\b(?:dob|born)\b/i
];
function containsPhiKeywords(...fields) {
  for (const field of fields) {
    if (!field?.trim()) continue;
    for (const pattern of PHI_PATTERNS) {
      if (pattern.test(field)) {
        return true;
      }
    }
  }
  return false;
}
function rejectIfPhi(...fields) {
  if (containsPhiKeywords(...fields)) {
    return { ok: false, error: PHI_REJECTION_MESSAGE };
  }
  return { ok: true };
}

// src/lib/moderation/banned-words.ts
var BANNED_WORDS = [
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "fck",
  "shit",
  "bullshit",
  "ass",
  "asshole",
  "bitch",
  "bitches",
  "bastard",
  "damn",
  "goddamn",
  "crap",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "slut",
  "whore",
  "twat",
  "prick",
  "wanker",
  "jackass",
  "douche",
  "douchebag",
  "dipshit",
  "retard",
  "retarded",
  "idiot",
  "moron",
  "stupid",
  "loser",
  "jerk",
  "scumbag",
  "pieceofshit",
  "wtf",
  "stfu",
  "gtfo",
  "lmfao"
];
var BANNED_WORDS_BY_LENGTH = [...BANNED_WORDS].sort((a, b) => b.length - a.length);

// src/lib/moderation/normalize.ts
var LEET_SUBSTITUTIONS = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i"
};
function applyLeetSubstitutions(text) {
  return [...text.toLowerCase()].map((char) => LEET_SUBSTITUTIONS[char] ?? char).join("");
}
function collapseRepeatedLetters(text) {
  return text.replace(/(.)\1{2,}/g, "$1");
}
function compactLetters(text) {
  return applyLeetSubstitutions(text).replace(/[^a-z]/g, "");
}
function normalizeSpaced(text) {
  return applyLeetSubstitutions(text).replace(/[^a-z]+/g, " ").trim().replace(/\s+/g, " ");
}
function normalizeForProfanity(text) {
  return collapseRepeatedLetters(compactLetters(text.trim()));
}
function normalizeTokens(text) {
  const spaced = normalizeSpaced(text);
  if (!spaced) return [];
  return spaced.split(" ").map((token) => normalizeForProfanity(token)).filter(Boolean);
}

// src/lib/moderation/profanity.ts
var PROFANITY_REJECTION_MESSAGE = "Please keep Breakroom respectful.";
var SHORT_WORD_MAX_LENGTH = 4;
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function matchesShortBannedWord(text, normalizedBanned) {
  const compact = normalizeForProfanity(text);
  if (compact === normalizedBanned) {
    return true;
  }
  const tokens = normalizeTokens(text);
  if (tokens.some((token) => token === normalizedBanned)) {
    return true;
  }
  const spaced = normalizeSpaced(text);
  if (!spaced) {
    return false;
  }
  const boundaryPattern = new RegExp(`(^|\\s)${escapeRegex(normalizedBanned)}(\\s|$)`);
  if (boundaryPattern.test(spaced)) {
    return true;
  }
  if (compact.length >= normalizedBanned.length + 2 && (compact.endsWith(normalizedBanned) || compact.startsWith(normalizedBanned))) {
    return true;
  }
  return false;
}
function matchesLongBannedWord(compact, normalizedBanned) {
  return compact.includes(normalizedBanned);
}
function findProfanity(text) {
  if (!text.trim()) {
    return null;
  }
  const compact = normalizeForProfanity(text);
  for (const banned of BANNED_WORDS_BY_LENGTH) {
    const normalizedBanned = normalizeForProfanity(banned);
    if (!normalizedBanned) continue;
    if (normalizedBanned.length <= SHORT_WORD_MAX_LENGTH) {
      if (matchesShortBannedWord(text, normalizedBanned)) {
        return banned;
      }
      continue;
    }
    if (matchesLongBannedWord(compact, normalizedBanned)) {
      return banned;
    }
  }
  return null;
}
function containsProfanity(text) {
  return findProfanity(text) !== null;
}
function rejectIfProfane(...fields) {
  for (const field of fields) {
    if (!field) continue;
    if (containsProfanity(field)) {
      return { ok: false, error: PROFANITY_REJECTION_MESSAGE };
    }
  }
  return { ok: true };
}

// src/lib/moderation/content-review.ts
function createDefaultModeration(status = "published") {
  return {
    status,
    moderationFlagged: false,
    moderationCategories: {},
    moderationScores: {},
    reviewedByAdmin: false
  };
}
function buildModerationFields(status, flagged, categories, scores) {
  return {
    status,
    moderationFlagged: flagged,
    moderationCategories: categories,
    moderationScores: scores,
    reviewedByAdmin: false
  };
}
async function reviewBreakroomContent(...textFields) {
  const phi = rejectIfPhi(...textFields);
  if (!phi.ok) {
    throw new ContentReviewError(phi.error, 400);
  }
  const profanity = rejectIfProfane(...textFields);
  if (!profanity.ok) {
    throw new ContentReviewError(profanity.error, 400);
  }
  const combined = textFields.filter((field) => field && field.trim()).join("\n");
  const openAi = await moderateTextWithOpenAI(combined);
  if (!openAi) {
    return {
      decision: "publish",
      moderation: createDefaultModeration("published")
    };
  }
  if (openAi.flagged) {
    return {
      decision: "pending_review",
      moderation: buildModerationFields(
        "pending_review",
        true,
        openAi.categories,
        openAi.categoryScores
      )
    };
  }
  return {
    decision: "publish",
    moderation: buildModerationFields("published", false, openAi.categories, openAi.categoryScores)
  };
}
var ContentReviewError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.name = "ContentReviewError";
    this.status = status;
  }
};

// src/lib/breakroom-storage.ts
var moduleDir2 = path2.dirname(fileURLToPath2(import.meta.url));
function emptyReactions() {
  return { like: 0, laugh: 0, support: 0, coffee: 0 };
}
function applyModerationFields(target, moderation) {
  target.status = moderation.status;
  target.moderationFlagged = moderation.moderationFlagged;
  target.moderationCategories = moderation.moderationCategories;
  target.moderationScores = moderation.moderationScores;
  target.reviewedByAdmin = moderation.reviewedByAdmin;
  target.reviewedAt = moderation.reviewedAt;
}
function normalizeComment(comment) {
  const defaults = createDefaultModeration(comment.status ?? "published");
  return {
    ...comment,
    status: comment.status ?? defaults.status,
    moderationFlagged: comment.moderationFlagged ?? defaults.moderationFlagged,
    moderationCategories: comment.moderationCategories ?? defaults.moderationCategories,
    moderationScores: comment.moderationScores ?? defaults.moderationScores,
    reviewedByAdmin: comment.reviewedByAdmin ?? defaults.reviewedByAdmin,
    reviewedAt: comment.reviewedAt
  };
}
function normalizePost(post) {
  const defaults = createDefaultModeration(post.status ?? "published");
  return {
    ...post,
    status: post.status ?? defaults.status,
    moderationFlagged: post.moderationFlagged ?? defaults.moderationFlagged,
    moderationCategories: post.moderationCategories ?? defaults.moderationCategories,
    moderationScores: post.moderationScores ?? defaults.moderationScores,
    reviewedByAdmin: post.reviewedByAdmin ?? defaults.reviewedByAdmin,
    reviewedAt: post.reviewedAt,
    comments: (post.comments ?? []).map(normalizeComment)
  };
}
function isPubliclyVisible(record) {
  return record.status === "published" && !record.isHidden;
}
function getStorePath() {
  if (process.env.BREAKROOM_DATA_FILE) {
    return process.env.BREAKROOM_DATA_FILE;
  }
  const repoRoot = path2.resolve(moduleDir2, "..", "..", "..");
  return path2.join(repoRoot, "data", "breakroom.json");
}
async function readStore() {
  const filePath = getStorePath();
  try {
    const raw = await readFile2(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.posts)) {
      return { posts: [] };
    }
    return { posts: parsed.posts.map((post) => normalizePost(post)) };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { posts: [] };
    }
    throw error;
  }
}
async function writeStore(store) {
  const filePath = getStorePath();
  await mkdir2(path2.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}
`, "utf8");
}
function formatRelativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 6e4));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
function toPublicComment(comment, viewerGuestId) {
  if (isPubliclyVisible(comment)) {
    return {
      id: comment.id,
      postId: comment.postId,
      nickname: comment.nickname,
      body: comment.body,
      timestamp: formatRelativeTime(comment.createdAt),
      createdAt: comment.createdAt,
      canDelete: viewerGuestId !== null && comment.guestId === viewerGuestId
    };
  }
  if (comment.isHidden) {
    return {
      id: comment.id,
      postId: comment.postId,
      nickname: "Moderator",
      body: "Comment removed by moderator",
      timestamp: formatRelativeTime(comment.updatedAt),
      createdAt: comment.createdAt,
      canDelete: false,
      removedByModerator: true
    };
  }
  return null;
}
function toPublicPost(post, viewerGuestId) {
  if (!isPubliclyVisible(post)) return null;
  const userReaction = viewerGuestId ? post.reactionVotes[viewerGuestId] ?? null : null;
  const visibleComments = post.comments.map((comment) => toPublicComment(comment, viewerGuestId)).filter((comment) => comment !== null);
  return {
    id: post.id,
    nickname: post.nickname,
    title: post.title,
    content: post.body,
    timestamp: formatRelativeTime(post.createdAt),
    createdAt: post.createdAt,
    reactions: { ...post.reactions },
    commentCount: visibleComments.length,
    comments: visibleComments,
    canEdit: viewerGuestId !== null && post.guestId === viewerGuestId,
    canDelete: viewerGuestId !== null && post.guestId === viewerGuestId,
    userReaction
  };
}
async function listPublicPosts(viewerGuestId) {
  const store = await readStore();
  return store.posts.map((post) => toPublicPost(post, viewerGuestId)).filter((post) => post !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function createPost(input) {
  const store = await readStore();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const post = {
    id: randomUUID2(),
    guestId: input.guestId,
    nickname: input.nickname,
    title: input.title,
    body: input.body,
    anonymous: input.anonymous,
    createdAt: now,
    updatedAt: now,
    isHidden: false,
    reportedCount: 0,
    reactions: emptyReactions(),
    reactionVotes: {},
    comments: [],
    ...createDefaultModeration()
  };
  applyModerationFields(post, input.moderation);
  store.posts.unshift(post);
  await writeStore(store);
  const pendingReview = input.moderation.status === "pending_review";
  return {
    post: pendingReview ? null : toPublicPost(post, input.guestId),
    pendingReview
  };
}
async function editPost(postId, guestId, updates, moderation) {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  if (post.guestId !== guestId) return "forbidden";
  if (updates.title !== void 0) post.title = updates.title;
  if (updates.body !== void 0) post.body = updates.body;
  if (moderation) {
    applyModerationFields(post, moderation);
  }
  post.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await writeStore(store);
  if (post.status === "pending_review") {
    return "pending_review";
  }
  return toPublicPost(post, guestId);
}
async function deletePost(postId, guestId, isAdmin) {
  const store = await readStore();
  const index = store.posts.findIndex((item) => item.id === postId);
  if (index === -1) return "not_found";
  const post = store.posts[index];
  if (!isAdmin && post.guestId !== guestId) return "forbidden";
  store.posts.splice(index, 1);
  await writeStore(store);
  return "ok";
}
async function createComment(input) {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === input.postId);
  if (!post || !isPubliclyVisible(post)) return "not_found";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const comment = {
    id: randomUUID2(),
    postId: input.postId,
    guestId: input.guestId,
    nickname: input.nickname,
    body: input.body,
    createdAt: now,
    updatedAt: now,
    isHidden: false,
    reportedCount: 0,
    ...createDefaultModeration()
  };
  applyModerationFields(comment, input.moderation);
  post.comments.push(comment);
  post.updatedAt = now;
  await writeStore(store);
  const pendingReview = input.moderation.status === "pending_review";
  return {
    comment: pendingReview ? null : toPublicComment(comment, input.guestId),
    pendingReview
  };
}
async function deleteComment(commentId, guestId, isAdmin) {
  const store = await readStore();
  for (const post of store.posts) {
    const index = post.comments.findIndex((comment2) => comment2.id === commentId);
    if (index === -1) continue;
    const comment = post.comments[index];
    if (!isAdmin && comment.guestId !== guestId) return "forbidden";
    post.comments.splice(index, 1);
    post.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}
async function setReaction(input) {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === input.postId);
  if (!post || !isPubliclyVisible(post)) return "not_found";
  const previous = post.reactionVotes[input.guestId];
  if (previous) {
    post.reactions[previous] = Math.max(0, post.reactions[previous] - 1);
  }
  if (previous === input.type) {
    delete post.reactionVotes[input.guestId];
  } else {
    post.reactionVotes[input.guestId] = input.type;
    post.reactions[input.type] += 1;
  }
  post.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await writeStore(store);
  return toPublicPost(post, input.guestId);
}
async function autoHideIfNeeded(reportedCount, isHidden) {
  if (isHidden) return true;
  return reportedCount >= BREAKROOM_REPORT_AUTO_HIDE_THRESHOLD;
}
async function reportPost(postId) {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  post.reportedCount += 1;
  if (await autoHideIfNeeded(post.reportedCount, post.isHidden)) {
    post.isHidden = true;
    post.hiddenReason = "auto-reported";
  }
  post.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await writeStore(store);
  return "ok";
}
async function reportComment(commentId) {
  const store = await readStore();
  for (const post of store.posts) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) continue;
    comment.reportedCount += 1;
    if (await autoHideIfNeeded(comment.reportedCount, comment.isHidden)) {
      comment.isHidden = true;
      comment.hiddenReason = "auto-reported";
    }
    comment.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    post.updatedAt = comment.updatedAt;
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}
async function adminHidePost(postId, reason, adminEmail) {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  post.isHidden = true;
  post.hiddenReason = reason;
  post.hiddenBy = adminEmail;
  post.hiddenAt = now;
  post.updatedAt = now;
  await writeStore(store);
  return "ok";
}
async function adminHideComment(commentId, reason, adminEmail) {
  const store = await readStore();
  for (const post of store.posts) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) continue;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    comment.isHidden = true;
    comment.hiddenReason = reason;
    comment.hiddenBy = adminEmail;
    comment.hiddenAt = now;
    comment.updatedAt = now;
    post.updatedAt = now;
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}
async function adminRestorePost(postId) {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  post.isHidden = false;
  delete post.hiddenReason;
  delete post.hiddenBy;
  delete post.hiddenAt;
  if (post.status === "rejected") {
    post.status = "published";
  }
  post.updatedAt = now;
  await writeStore(store);
  return "ok";
}
async function adminRestoreComment(commentId) {
  const store = await readStore();
  for (const post of store.posts) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) continue;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    comment.isHidden = false;
    delete comment.hiddenReason;
    delete comment.hiddenBy;
    delete comment.hiddenAt;
    if (comment.status === "rejected") {
      comment.status = "published";
    }
    comment.updatedAt = now;
    post.updatedAt = now;
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}
async function listAdminModerationContent() {
  const store = await readStore();
  const posts = store.posts.map((post) => ({
    id: post.id,
    guestId: post.guestId,
    nickname: post.nickname,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isHidden: post.isHidden,
    hiddenReason: post.hiddenReason,
    hiddenBy: post.hiddenBy,
    hiddenAt: post.hiddenAt,
    reportedCount: post.reportedCount,
    status: post.status,
    moderationFlagged: post.moderationFlagged,
    commentCount: post.comments.length
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const comments = [];
  for (const post of store.posts) {
    for (const comment of post.comments) {
      comments.push({
        id: comment.id,
        postId: post.id,
        guestId: comment.guestId,
        nickname: comment.nickname,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        isHidden: comment.isHidden,
        hiddenReason: comment.hiddenReason,
        hiddenBy: comment.hiddenBy,
        hiddenAt: comment.hiddenAt,
        reportedCount: comment.reportedCount,
        status: comment.status,
        moderationFlagged: comment.moderationFlagged
      });
    }
  }
  comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { posts, comments };
}
function applyAdminReview(record, decision, _reviewer) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  record.reviewedByAdmin = true;
  record.reviewedAt = now;
  record.updatedAt = now;
  if (decision === "approve") {
    record.status = "published";
    record.isHidden = false;
    return;
  }
  record.status = "rejected";
  record.isHidden = true;
  record.hiddenReason = "admin-rejected";
}
async function adminReviewPost(postId, decision, reviewer) {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  applyAdminReview(post, decision, reviewer);
  await writeStore(store);
  return "ok";
}
async function adminReviewComment(commentId, decision, reviewer) {
  const store = await readStore();
  for (const post of store.posts) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) continue;
    applyAdminReview(comment, decision, reviewer);
    post.updatedAt = comment.updatedAt;
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}
async function listPendingModeration() {
  const store = await readStore();
  const posts = store.posts.filter((post) => post.status === "pending_review");
  const comments = [];
  for (const post of store.posts) {
    for (const comment of post.comments) {
      if (comment.status === "pending_review") {
        comments.push({ postId: post.id, comment });
      }
    }
  }
  return { posts, comments };
}
async function seedBreakroomIfEmpty() {
  const store = await readStore();
  if (store.posts.length > 0) return;
  const now = Date.now();
  const seedPosts = [
    {
      nickname: "IVQueen03",
      title: "",
      body: 'Charge asked for a "quick update" and my brain served her a full TED talk with footnotes. She said "shorter" and I still went three more minutes. We are not the same species.',
      anonymous: false,
      isHidden: false,
      reportedCount: 0,
      reactions: { like: 18, laugh: 42, support: 9, coffee: 14 },
      reactionVotes: {},
      comments: []
    },
    {
      nickname: "NightOwlRN",
      title: "",
      body: "0300 vibes: the hallway is quiet, the monitor is loud, and I am negotiating with a sandwich like it is a binding contract. At least coffee still loves me back.",
      anonymous: false,
      isHidden: false,
      reportedCount: 0,
      reactions: { like: 31, laugh: 27, support: 6, coffee: 5 },
      reactionVotes: {},
      comments: []
    }
  ];
  store.posts = seedPosts.map((post, index) => {
    const createdAt = new Date(now - (index + 1) * 36e5).toISOString();
    return normalizePost({
      id: randomUUID2(),
      guestId: "seed",
      createdAt,
      updatedAt: createdAt,
      ...post,
      ...createDefaultModeration("published")
    });
  });
  await writeStore(store);
}

// src/lib/breakroom-validation.ts
import { z } from "zod";
var MONGO_OPERATOR_PATTERN = /^\$/;
function containsMongoOperators(value) {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsMongoOperators(item));
  }
  for (const [key, nested] of Object.entries(value)) {
    if (MONGO_OPERATOR_PATTERN.test(key) || containsMongoOperators(nested)) {
      return true;
    }
  }
  return false;
}
function rejectUnexpectedKeys(record, allowed) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      return "Invalid request fields.";
    }
  }
  return null;
}
function honeypotTriggered(record) {
  return typeof record.companyWebsite === "string" && record.companyWebsite.trim().length > 0;
}
var nicknameSchema = z.string().max(BREAKROOM_NICKNAME_MAX).optional().transform((value) => value ? sanitizeText(value, BREAKROOM_NICKNAME_MAX) : "");
var postBodySchema = z.string().min(BREAKROOM_POST_BODY_MIN, "Post body is required.").max(BREAKROOM_POST_BODY_MAX, "Post is too long.").transform((value) => sanitizeText(value, BREAKROOM_POST_BODY_MAX)).refine((value) => value.length >= BREAKROOM_POST_BODY_MIN, "Post body is required.");
var commentBodySchema = z.string().min(BREAKROOM_COMMENT_BODY_MIN, "Comment is required.").max(BREAKROOM_COMMENT_BODY_MAX, "Comment is too long.").transform((value) => sanitizeText(value, BREAKROOM_COMMENT_BODY_MAX)).refine((value) => value.length >= BREAKROOM_COMMENT_BODY_MIN, "Comment is required.");
function validateCreatePostBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  if (containsMongoOperators(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  const record = body;
  const unexpected = rejectUnexpectedKeys(record, BREAKROOM_ALLOWED_POST_KEYS);
  if (unexpected) return { ok: false, error: unexpected, status: 400 };
  if (honeypotTriggered(record)) {
    return { ok: true, data: { title: "", body: "", nickname: "", anonymous: true }, isHoneypotTriggered: true };
  }
  const schema = z.object({
    title: z.string().max(BREAKROOM_POST_TITLE_MAX, "Title is too long.").optional().transform((value) => value ? sanitizeText(value, BREAKROOM_POST_TITLE_MAX) : ""),
    body: postBodySchema,
    nickname: nicknameSchema,
    anonymous: z.boolean().optional().default(false)
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
      anonymous: parsed.data.anonymous
    }
  };
}
function validateEditPostBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  if (containsMongoOperators(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  const record = body;
  const unexpected = rejectUnexpectedKeys(record, BREAKROOM_ALLOWED_EDIT_POST_KEYS);
  if (unexpected) return { ok: false, error: unexpected, status: 400 };
  if (honeypotTriggered(record)) {
    return { ok: true, data: {}, isHoneypotTriggered: true };
  }
  const schema = z.object({
    title: z.string().max(BREAKROOM_POST_TITLE_MAX, "Title is too long.").optional().transform((value) => value ? sanitizeText(value, BREAKROOM_POST_TITLE_MAX) : void 0),
    body: z.string().min(BREAKROOM_POST_BODY_MIN, "Post body is required.").max(BREAKROOM_POST_BODY_MAX, "Post is too long.").optional().transform((value) => value ? sanitizeText(value, BREAKROOM_POST_BODY_MAX) : void 0)
  }).refine((value) => value.title !== void 0 || value.body !== void 0, {
    message: "Nothing to update."
  });
  const parsed = schema.safeParse(record);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
    return { ok: false, error: message, status: 400 };
  }
  if (parsed.data.body !== void 0 && parsed.data.body.length < BREAKROOM_POST_BODY_MIN) {
    return { ok: false, error: "Post body is required.", status: 400 };
  }
  return { ok: true, data: parsed.data };
}
function validateCreateCommentBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  if (containsMongoOperators(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  const record = body;
  const unexpected = rejectUnexpectedKeys(record, BREAKROOM_ALLOWED_COMMENT_KEYS);
  if (unexpected) return { ok: false, error: unexpected, status: 400 };
  if (honeypotTriggered(record)) {
    return { ok: true, data: { body: "", nickname: "", anonymous: true }, isHoneypotTriggered: true };
  }
  const schema = z.object({
    body: commentBodySchema,
    nickname: nicknameSchema,
    anonymous: z.boolean().optional().default(false)
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
      anonymous: parsed.data.anonymous
    }
  };
}
function validateReactionBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  if (containsMongoOperators(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  const record = body;
  const unexpected = rejectUnexpectedKeys(record, BREAKROOM_ALLOWED_REACTION_KEYS);
  if (unexpected) return { ok: false, error: unexpected, status: 400 };
  if (honeypotTriggered(record)) {
    return { ok: true, data: { type: "like" }, isHoneypotTriggered: true };
  }
  const schema = z.object({
    type: z.enum(BREAKROOM_REACTION_TYPES, { message: "Invalid reaction type." })
  });
  const parsed = schema.safeParse(record);
  if (!parsed.success) {
    return { ok: false, error: "Invalid reaction type.", status: 400 };
  }
  return { ok: true, data: parsed.data };
}
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidBreakroomId(value) {
  return UUID_PATTERN.test(value) || /^post-[a-z0-9-]+$/i.test(value) || /^comment-[a-z0-9-]+$/i.test(value);
}

// src/lib/moderation-log.ts
import { randomUUID as randomUUID3 } from "node:crypto";
import { appendFile as appendFile2, mkdir as mkdir3 } from "node:fs/promises";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var moduleDir3 = path3.dirname(fileURLToPath3(import.meta.url));
function getModerationLogPath() {
  if (process.env.MODERATION_LOG_FILE) {
    return process.env.MODERATION_LOG_FILE;
  }
  const repoRoot = path3.resolve(moduleDir3, "..", "..", "..");
  return path3.join(repoRoot, "data", "moderation-logs.jsonl");
}
async function appendModerationLog(input) {
  const record = {
    id: randomUUID3(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...input
  };
  const filePath = getModerationLogPath();
  await mkdir3(path3.dirname(filePath), { recursive: true });
  await appendFile2(filePath, `${JSON.stringify(record)}
`, "utf8");
  return record;
}

// src/routes/breakroom-admin.ts
var router3 = Router3();
router3.use((req, res, next) => {
  if (req.method === "GET") {
    next();
    return;
  }
  requireBreakroomMutationOrigin(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    breakroomMutateRateLimit(req, res, next);
  });
});
async function runAdminAction(req, res, handler, log) {
  const googleSession = requireFullAdminAccess(req, res);
  if (!googleSession) return;
  try {
    const result = await handler(googleSession.email);
    if (result === "not_found") {
      res.status(404).json({ ok: false, error: "Content could not be found." });
      return;
    }
    await appendModerationLog({
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      adminEmail: googleSession.email,
      reason: log.reason
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[breakroom] admin moderation action failed", {
      action: log.action,
      targetId: log.targetId,
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Moderation action failed." });
  }
}
router3.get("/admin/breakroom/content", async (req, res) => {
  if (!requireFullAdminAccess(req, res)) return;
  try {
    const content = await listAdminModerationContent();
    res.status(200).json({ ok: true, ...content });
  } catch (error) {
    console.error("[breakroom] admin list content failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Breakroom content could not be loaded." });
  }
});
router3.get("/admin/breakroom/pending", async (req, res) => {
  if (!requireFullAdminAccess(req, res)) return;
  try {
    const pending = await listPendingModeration();
    res.status(200).json({ ok: true, ...pending });
  } catch (error) {
    console.error("[breakroom] admin list pending failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Pending content could not be loaded." });
  }
});
router3.post("/admin/breakroom/posts/:postId/hide", async (req, res) => {
  const postId = req.params.postId;
  if (!isValidBreakroomId(postId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  const reason = normalizeModerationReason(req.body?.reason);
  await runAdminAction(
    req,
    res,
    (adminEmail) => adminHidePost(postId, reason, adminEmail),
    { action: "hide_post", targetType: "post", targetId: postId, reason }
  );
});
router3.post("/admin/breakroom/posts/:postId/restore", async (req, res) => {
  const postId = req.params.postId;
  if (!isValidBreakroomId(postId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  await runAdminAction(
    req,
    res,
    () => adminRestorePost(postId),
    { action: "restore_post", targetType: "post", targetId: postId, reason: "restored" }
  );
});
router3.delete("/admin/breakroom/posts/:postId", async (req, res) => {
  const postId = req.params.postId;
  if (!isValidBreakroomId(postId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  const googleSession = requireFullAdminAccess(req, res);
  if (!googleSession) return;
  const reason = normalizeModerationReason(req.body?.reason ?? "permanent delete");
  try {
    const result = await deletePost(postId, "admin", true);
    if (result === "not_found") {
      res.status(404).json({ ok: false, error: "Post could not be found." });
      return;
    }
    await appendModerationLog({
      action: "delete_post",
      targetType: "post",
      targetId: postId,
      adminEmail: googleSession.email,
      reason
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[breakroom] admin delete post failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Moderation action failed." });
  }
});
router3.post("/admin/breakroom/comments/:commentId/hide", async (req, res) => {
  const commentId = req.params.commentId;
  if (!isValidBreakroomId(commentId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  const reason = normalizeModerationReason(req.body?.reason);
  await runAdminAction(
    req,
    res,
    (adminEmail) => adminHideComment(commentId, reason, adminEmail),
    { action: "hide_comment", targetType: "comment", targetId: commentId, reason }
  );
});
router3.post("/admin/breakroom/comments/:commentId/restore", async (req, res) => {
  const commentId = req.params.commentId;
  if (!isValidBreakroomId(commentId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  await runAdminAction(
    req,
    res,
    () => adminRestoreComment(commentId),
    { action: "restore_comment", targetType: "comment", targetId: commentId, reason: "restored" }
  );
});
router3.delete("/admin/breakroom/comments/:commentId", async (req, res) => {
  const commentId = req.params.commentId;
  if (!isValidBreakroomId(commentId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  const googleSession = requireFullAdminAccess(req, res);
  if (!googleSession) return;
  const reason = normalizeModerationReason(req.body?.reason ?? "permanent delete");
  try {
    const result = await deleteComment(commentId, "admin", true);
    if (result === "not_found") {
      res.status(404).json({ ok: false, error: "Comment could not be found." });
      return;
    }
    await appendModerationLog({
      action: "delete_comment",
      targetType: "comment",
      targetId: commentId,
      adminEmail: googleSession.email,
      reason
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[breakroom] admin delete comment failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Moderation action failed." });
  }
});
router3.post("/admin/breakroom/posts/:postId/review", async (req, res) => {
  const postId = req.params.postId;
  if (!isValidBreakroomId(postId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  const decision = req.body?.decision === "reject" ? "reject" : "approve";
  const reason = decision === "reject" ? normalizeModerationReason(req.body?.reason) : "approved";
  await runAdminAction(
    req,
    res,
    (adminEmail) => adminReviewPost(postId, decision, adminEmail),
    {
      action: decision === "reject" ? "reject_post" : "approve_post",
      targetType: "post",
      targetId: postId,
      reason
    }
  );
});
router3.post("/admin/breakroom/comments/:commentId/review", async (req, res) => {
  const commentId = req.params.commentId;
  if (!isValidBreakroomId(commentId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  const decision = req.body?.decision === "reject" ? "reject" : "approve";
  const reason = decision === "reject" ? normalizeModerationReason(req.body?.reason) : "approved";
  await runAdminAction(
    req,
    res,
    (adminEmail) => adminReviewComment(commentId, decision, adminEmail),
    {
      action: decision === "reject" ? "reject_comment" : "approve_comment",
      targetType: "comment",
      targetId: commentId,
      reason
    }
  );
});
var breakroom_admin_default = router3;

// src/routes/breakroom.ts
import { Router as Router4 } from "express";

// src/lib/breakroom-auth.ts
function requireBreakroomCsrf(req, res, next) {
  if (verifyBreakroomCsrf(req)) {
    next();
    return;
  }
  res.status(403).json({ ok: false, error: "Invalid security token." });
}
function requireBreakroomAuth(req, res, next) {
  if (requireBreakroomGuest(req)) {
    next();
    return;
  }
  res.status(401).json({ ok: false, error: "You are not allowed to edit this." });
}

// src/routes/breakroom.ts
var router4 = Router4();
var mutationGuards = [
  requireBreakroomMutationOrigin,
  requireBreakroomCsrf
];
function runGuards(handlers, req, res, next, index = 0) {
  if (index >= handlers.length) {
    next();
    return;
  }
  handlers[index](req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    runGuards(handlers, req, res, next, index + 1);
  });
}
function withGuards(...handlers) {
  return (req, res, next) => {
    runGuards([...mutationGuards, ...handlers], req, res, next);
  };
}
router4.get("/breakroom/session", async (_req, res) => {
  try {
    await seedBreakroomIfEmpty();
    const session = ensureBreakroomSession(_req, res);
    res.status(200).json({
      ok: true,
      csrfToken: session.csrfToken,
      guestId: session.guestId
    });
  } catch (error) {
    console.error("[breakroom] session failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Session could not be started." });
  }
});
router4.get("/breakroom/posts", async (req, res) => {
  try {
    await seedBreakroomIfEmpty();
    const viewerGuestId = getBreakroomSession(req)?.guestId ?? null;
    const posts = await listPublicPosts(viewerGuestId);
    res.status(200).json({ ok: true, posts });
  } catch (error) {
    console.error("[breakroom] list posts failed", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({ ok: false, error: "Posts could not be loaded." });
  }
});
router4.post(
  "/breakroom/posts",
  withGuards(requireBreakroomAuth, breakroomCreatePostRateLimit),
  async (req, res) => {
    const validation = validateCreatePostBody(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ ok: false, error: validation.error });
      return;
    }
    if (validation.isHoneypotTriggered) {
      res.status(200).json({ ok: true });
      return;
    }
    const guestId = getBreakroomSession(req).guestId;
    try {
      const review = await reviewBreakroomContent(
        validation.data.title,
        validation.data.body,
        validation.data.nickname
      );
      const result = await createPost({
        guestId,
        nickname: validation.data.nickname,
        title: validation.data.title,
        body: validation.data.body,
        anonymous: validation.data.anonymous,
        moderation: review.moderation
      });
      if (result.pendingReview) {
        res.status(202).json({
          ok: true,
          pendingReview: true,
          message: BREAKROOM_PENDING_REVIEW_POST_MESSAGE
        });
        return;
      }
      res.status(201).json({ ok: true, post: result.post });
    } catch (error) {
      if (error instanceof ContentReviewError) {
        res.status(error.status).json({ ok: false, error: error.message });
        return;
      }
      console.error("[breakroom] create post failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      res.status(500).json({ ok: false, error: "Post could not be submitted." });
    }
  }
);
router4.patch(
  "/breakroom/posts/:postId",
  withGuards(requireBreakroomAuth, breakroomMutateRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }
    const validation = validateEditPostBody(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ ok: false, error: validation.error });
      return;
    }
    if (validation.isHoneypotTriggered) {
      res.status(200).json({ ok: true });
      return;
    }
    const guestId = getBreakroomSession(req).guestId;
    try {
      const review = await reviewBreakroomContent(validation.data.title, validation.data.body);
      const result = await editPost(postId, guestId, validation.data, review.moderation);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({ ok: false, error: "You are not allowed to edit this." });
        return;
      }
      if (result === "pending_review") {
        res.status(202).json({
          ok: true,
          pendingReview: true,
          message: BREAKROOM_PENDING_REVIEW_POST_MESSAGE
        });
        return;
      }
      res.status(200).json({ ok: true, post: result });
    } catch (error) {
      if (error instanceof ContentReviewError) {
        res.status(error.status).json({ ok: false, error: error.message });
        return;
      }
      console.error("[breakroom] edit post failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      res.status(500).json({ ok: false, error: "Post could not be updated." });
    }
  }
);
router4.delete(
  "/breakroom/posts/:postId",
  withGuards(requireBreakroomAuth, breakroomMutateRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }
    const guestId = getBreakroomSession(req).guestId;
    try {
      const result = await deletePost(postId, guestId, false);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({ ok: false, error: "You are not allowed to edit this." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[breakroom] delete post failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      res.status(500).json({ ok: false, error: "Post could not be deleted." });
    }
  }
);
router4.post(
  "/breakroom/posts/:postId/comments",
  withGuards(requireBreakroomAuth, breakroomCreateCommentRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }
    const validation = validateCreateCommentBody(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ ok: false, error: validation.error });
      return;
    }
    if (validation.isHoneypotTriggered) {
      res.status(200).json({ ok: true });
      return;
    }
    const guestId = getBreakroomSession(req).guestId;
    try {
      const review = await reviewBreakroomContent(validation.data.body, validation.data.nickname);
      const result = await createComment({
        postId,
        guestId,
        nickname: validation.data.nickname,
        body: validation.data.body,
        moderation: review.moderation
      });
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      if (result.pendingReview) {
        res.status(202).json({
          ok: true,
          pendingReview: true,
          message: BREAKROOM_PENDING_REVIEW_COMMENT_MESSAGE
        });
        return;
      }
      res.status(201).json({ ok: true, comment: result.comment });
    } catch (error) {
      if (error instanceof ContentReviewError) {
        res.status(error.status).json({ ok: false, error: error.message });
        return;
      }
      console.error("[breakroom] create comment failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      res.status(500).json({ ok: false, error: "Comment could not be submitted." });
    }
  }
);
router4.delete(
  "/breakroom/comments/:commentId",
  withGuards(requireBreakroomAuth, breakroomMutateRateLimit),
  async (req, res) => {
    const commentId = req.params.commentId;
    if (!isValidBreakroomId(commentId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }
    const guestId = getBreakroomSession(req).guestId;
    try {
      const result = await deleteComment(commentId, guestId, false);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Comment could not be found." });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({ ok: false, error: "You are not allowed to edit this." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[breakroom] delete comment failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      res.status(500).json({ ok: false, error: "Comment could not be deleted." });
    }
  }
);
router4.post(
  "/breakroom/posts/:postId/reactions",
  withGuards(requireBreakroomAuth, breakroomReactionRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }
    const validation = validateReactionBody(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ ok: false, error: validation.error });
      return;
    }
    if (validation.isHoneypotTriggered) {
      res.status(200).json({ ok: true });
      return;
    }
    const guestId = getBreakroomSession(req).guestId;
    try {
      const post = await setReaction({
        postId,
        guestId,
        type: validation.data.type
      });
      if (!post) {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      res.status(200).json({ ok: true, post });
    } catch (error) {
      console.error("[breakroom] reaction failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      res.status(500).json({ ok: false, error: "Reaction could not be saved." });
    }
  }
);
router4.post(
  "/breakroom/posts/:postId/report",
  withGuards(requireBreakroomAuth, breakroomReportRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }
    try {
      const result = await reportPost(postId);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[breakroom] report post failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      res.status(500).json({ ok: false, error: "Report could not be submitted." });
    }
  }
);
router4.post(
  "/breakroom/comments/:commentId/report",
  withGuards(requireBreakroomAuth, breakroomReportRateLimit),
  async (req, res) => {
    const commentId = req.params.commentId;
    if (!isValidBreakroomId(commentId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }
    try {
      const result = await reportComment(commentId);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Comment could not be found." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[breakroom] report comment failed", {
        reason: error instanceof Error ? error.message : "unknown"
      });
      res.status(500).json({ ok: false, error: "Report could not be submitted." });
    }
  }
);
var breakroom_default = router4;

// src/routes/feedback.ts
import { Router as Router5 } from "express";

// src/lib/feedback-rate-limit.ts
var WINDOW_MS = 15 * 60 * 1e3;
var MAX_REQUESTS = 5;
var buckets2 = /* @__PURE__ */ new Map();
function getClientIp2(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}
function feedbackRateLimit(req, res, next) {
  const ip = getClientIp2(req);
  const now = Date.now();
  const bucket = buckets2.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    buckets2.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }
  if (bucket.count >= MAX_REQUESTS) {
    res.status(429).json({
      ok: false,
      error: "Too many feedback submissions. Please try again later."
    });
    return;
  }
  bucket.count += 1;
  next();
}

// src/lib/feedback-constants.ts
var FEEDBACK_TYPES = [
  "Bug Report",
  "Feature Request",
  "Template Suggestion",
  "UI Feedback",
  "General Feedback"
];
var FEATURE_AREAS = [
  "Homepage",
  "Templates",
  "Builder",
  "Printing",
  "Coming Soon",
  "Account",
  "Other"
];
var SEVERITIES = ["Low", "Medium", "High"];
var DEFAULT_TYPE = "General Feedback";
var DEFAULT_FEATURE_AREA = "Other";
var DEFAULT_SEVERITY = "Medium";
var FEEDBACK_ALLOWED_BODY_KEYS = /* @__PURE__ */ new Set([
  "type",
  "featureArea",
  "severity",
  "message",
  "pageUrl",
  "timestamp",
  "companyWebsite"
]);
var LIMITS = {
  messageMin: 5,
  messageMax: 2e3,
  typeMax: 50,
  featureAreaMax: 50,
  severityMax: 20,
  pageUrlMax: 500,
  timestampMax: 100
};

// src/lib/feedback-validation.ts
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function stringFieldTooLong(value, max) {
  return typeof value === "string" && value.length > max;
}
function resolveEnumField(value, allowed, defaultValue, fieldName, maxLength) {
  if (value === void 0 || value === null || value === "") {
    return { ok: true, value: defaultValue };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `Invalid ${fieldName}.` };
  }
  if (value.length > maxLength) {
    return { ok: false, error: `${fieldName} is too long.` };
  }
  if (!allowed.includes(value)) {
    return { ok: false, error: `Invalid ${fieldName}.` };
  }
  return { ok: true, value };
}
function validateFeedbackBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  const record = body;
  const keys = Object.keys(record);
  if (keys.length === 0) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }
  for (const key of keys) {
    if (!FEEDBACK_ALLOWED_BODY_KEYS.has(key)) {
      return { ok: false, error: "Invalid request fields.", status: 400 };
    }
  }
  if (stringFieldTooLong(record.type, LIMITS.typeMax)) {
    return { ok: false, error: "Type is too long.", status: 400 };
  }
  if (stringFieldTooLong(record.featureArea, LIMITS.featureAreaMax)) {
    return { ok: false, error: "Feature area is too long.", status: 400 };
  }
  if (stringFieldTooLong(record.severity, LIMITS.severityMax)) {
    return { ok: false, error: "Severity is too long.", status: 400 };
  }
  if (stringFieldTooLong(record.pageUrl, LIMITS.pageUrlMax)) {
    return { ok: false, error: "Page URL is too long.", status: 400 };
  }
  if (stringFieldTooLong(record.timestamp, LIMITS.timestampMax)) {
    return { ok: false, error: "Timestamp is too long.", status: 400 };
  }
  const typeResult = resolveEnumField(
    record.type,
    FEEDBACK_TYPES,
    DEFAULT_TYPE,
    "feedback type",
    LIMITS.typeMax
  );
  if (!typeResult.ok) {
    return { ok: false, error: typeResult.error, status: 400 };
  }
  const featureAreaResult = resolveEnumField(
    record.featureArea,
    FEATURE_AREAS,
    DEFAULT_FEATURE_AREA,
    "feature area",
    LIMITS.featureAreaMax
  );
  if (!featureAreaResult.ok) {
    return { ok: false, error: featureAreaResult.error, status: 400 };
  }
  const severityResult = resolveEnumField(
    record.severity,
    SEVERITIES,
    DEFAULT_SEVERITY,
    "severity",
    LIMITS.severityMax
  );
  if (!severityResult.ok) {
    return { ok: false, error: severityResult.error, status: 400 };
  }
  if (!isNonEmptyString(record.message)) {
    return { ok: false, error: "Message is required.", status: 400 };
  }
  if (record.message.length > LIMITS.messageMax) {
    return { ok: false, error: "Message is too long.", status: 400 };
  }
  const message = sanitizeText(record.message, LIMITS.messageMax);
  if (message.length < LIMITS.messageMin) {
    return { ok: false, error: "Message must be at least 5 characters.", status: 400 };
  }
  const pageUrl = isNonEmptyString(record.pageUrl) ? sanitizeText(record.pageUrl, LIMITS.pageUrlMax) : "unknown";
  const timestamp = isNonEmptyString(record.timestamp) ? sanitizeText(record.timestamp, LIMITS.timestampMax) : (/* @__PURE__ */ new Date()).toISOString();
  const isHoneypotTriggered = typeof record.companyWebsite === "string" && record.companyWebsite.trim().length > 0;
  return {
    ok: true,
    data: {
      type: typeResult.value,
      featureArea: featureAreaResult.value,
      severity: severityResult.value,
      message,
      pageUrl,
      timestamp,
      isHoneypotTriggered
    }
  };
}

// src/lib/resend-client.ts
import { Resend } from "resend";
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

// src/lib/send-feedback-email.ts
function buildPlainText(input) {
  return [
    "ReportReady Feedback",
    "",
    `Type: ${input.type}`,
    `Feature Area: ${input.featureArea}`,
    `Severity: ${input.severity}`,
    "",
    "Message:",
    input.message,
    "",
    `Page URL: ${input.pageUrl}`,
    `Timestamp: ${input.timestamp}`,
    `User Agent: ${input.userAgent}`,
    "",
    "App: ReportReady"
  ].join("\n");
}
function buildHtml(input) {
  const rows = [
    ["Type", input.type],
    ["Feature Area", input.featureArea],
    ["Severity", input.severity],
    ["Page URL", input.pageUrl],
    ["Timestamp", input.timestamp],
    ["User Agent", input.userAgent],
    ["App", "ReportReady"]
  ];
  const tableRows = rows.map(
    ([label, value]) => `<tr><td style="padding:6px 12px 6px 0;font-weight:600;vertical-align:top;color:#334155">${escapeHtml(label)}</td><td style="padding:6px 0;color:#0f172a">${escapeHtml(value)}</td></tr>`
  ).join("");
  return `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5">
    <h2 style="margin:0 0 16px">ReportReady Feedback</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">${tableRows}</table>
    <p style="margin:0 0 8px;font-weight:600">Message</p>
    <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:0">${escapeHtml(input.message)}</pre>
  </body>
</html>`;
}
async function sendFeedbackEmail(input) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Email delivery is not configured.");
  }
  const to = process.env.FEEDBACK_TO_EMAIL?.trim() || "support@nexusgarden.live";
  const from = process.env.FEEDBACK_FROM_EMAIL?.trim() || "ReportReady <support@nexusgarden.live>";
  const subject = `[ReportReady Feedback] ${input.type} - ${input.severity}`;
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    text: buildPlainText(input),
    html: buildHtml(input)
  });
  if (error) {
    throw new Error(error.message || "Failed to send feedback email.");
  }
}

// src/routes/feedback.ts
var router5 = Router5();
router5.all("/feedback", (req, res, next) => {
  if (req.method === "POST") {
    next();
    return;
  }
  res.set("Allow", "POST");
  res.status(405).json({ ok: false, error: "Method not allowed." });
});
router5.post("/feedback", feedbackRateLimit, async (req, res) => {
  const validation = validateFeedbackBody(req.body);
  if (!validation.ok) {
    res.status(validation.status).json({ ok: false, error: validation.error });
    return;
  }
  const { data } = validation;
  if (data.isHoneypotTriggered) {
    console.info("[feedback] honeypot", {
      timestamp: data.timestamp,
      featureArea: data.featureArea,
      severity: data.severity,
      outcome: "ignored"
    });
    res.status(200).json({ ok: true });
    return;
  }
  const userAgent = sanitizeText(req.get("user-agent") ?? "unknown", 500);
  try {
    await sendFeedbackEmail({
      type: data.type,
      featureArea: data.featureArea,
      severity: data.severity,
      message: data.message,
      pageUrl: data.pageUrl,
      timestamp: data.timestamp,
      userAgent
    });
    console.info("[feedback] sent", {
      timestamp: data.timestamp,
      featureArea: data.featureArea,
      severity: data.severity,
      outcome: "success"
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[feedback] send failed", {
      timestamp: data.timestamp,
      featureArea: data.featureArea,
      severity: data.severity,
      outcome: "failure",
      reason: error instanceof Error ? error.message : "unknown"
    });
    res.status(500).json({
      ok: false,
      error: "Feedback could not be sent. Please try again."
    });
  }
});
var feedback_default = router5;

// src/routes/health.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});
var health_default = router6;

// src/routes/test-email.ts
import { Router as Router7 } from "express";
var router7 = Router7();
var TEST_FROM = "support@nexusgarden.live";
var TEST_TO = "support@nexusgarden.live";
var TEST_SUBJECT = "ReportReady Email Test";
var TEST_BODY = "If you received this email, Resend is configured correctly.";
router7.post("/test-email", feedbackRateLimit, async (_req, res) => {
  const resend = getResendClient();
  if (!resend) {
    res.status(500).json({ ok: false, error: "Email delivery is not configured." });
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: TEST_FROM,
      to: [TEST_TO],
      subject: TEST_SUBJECT,
      text: TEST_BODY
    });
    if (error) {
      throw new Error(error.message || "Failed to send test email.");
    }
    console.info("[test-email] sent", { to: TEST_TO });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[test-email] send failed", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to send test email."
    });
  }
});
var test_email_default = router7;

// src/routes/index.ts
var router8 = Router8();
router8.use(health_default);
router8.use(feedback_default);
router8.use(test_email_default);
router8.use(analytics_default);
router8.use(analytics_admin_default);
router8.use(breakroom_default);
router8.use(breakroom_admin_default);
var routes_default = router8;

// src/app.ts
var app = express();
var corsOrigins = process.env.CORS_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean);
app.use(securityHeaders);
app.use(
  cors(
    corsOrigins && corsOrigins.length > 0 ? { origin: corsOrigins, methods: ["GET", "POST", "PATCH", "DELETE"], credentials: true } : { origin: false }
  )
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use("/api", routes_default);
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ ok: false, error: "Invalid request body." });
    return;
  }
  next(err);
});
var app_default = app;

// src/index.ts
var rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
var port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}
app_default.listen(port, () => {
  console.log(`[api-server] listening on port ${port}`);
});
