// src/app.ts
import cors from "cors";
import express from "express";

// src/routes/index.ts
import { Router as Router6 } from "express";

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
function checkRateLimit(buckets2, key, max, windowMs) {
  const now = Date.now();
  const bucket = buckets2.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets2.set(key, { count: 1, resetAt: now + windowMs });
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
  return [...counts.entries()].map(([path2, count]) => ({ path: path2, count })).sort((a, b) => b.count - a.count).slice(0, limit);
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

// src/routes/feedback.ts
import { Router as Router3 } from "express";

// src/lib/feedback-rate-limit.ts
var WINDOW_MS = 15 * 60 * 1e3;
var MAX_REQUESTS = 5;
var buckets = /* @__PURE__ */ new Map();
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
  const bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
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
var router3 = Router3();
router3.all("/feedback", (req, res, next) => {
  if (req.method === "POST") {
    next();
    return;
  }
  res.set("Allow", "POST");
  res.status(405).json({ ok: false, error: "Method not allowed." });
});
router3.post("/feedback", feedbackRateLimit, async (req, res) => {
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
var feedback_default = router3;

// src/routes/health.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});
var health_default = router4;

// src/routes/test-email.ts
import { Router as Router5 } from "express";
var router5 = Router5();
var TEST_FROM = "support@nexusgarden.live";
var TEST_TO = "support@nexusgarden.live";
var TEST_SUBJECT = "ReportReady Email Test";
var TEST_BODY = "If you received this email, Resend is configured correctly.";
router5.post("/test-email", feedbackRateLimit, async (_req, res) => {
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
var test_email_default = router5;

// src/routes/index.ts
var router6 = Router6();
router6.use(health_default);
router6.use(feedback_default);
router6.use(test_email_default);
router6.use(analytics_default);
router6.use(analytics_admin_default);
var routes_default = router6;

// src/app.ts
var app = express();
var corsOrigins = process.env.CORS_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean);
app.use(
  cors(
    corsOrigins && corsOrigins.length > 0 ? { origin: corsOrigins, methods: ["GET", "POST"] } : { origin: false }
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
