import { Router } from "express";
import { ANALYTICS_RANGES, type AnalyticsRange } from "../lib/analytics-constants.js";
import { analyticsLoginRateLimit, analyticsPinRateLimit } from "../lib/analytics-rate-limit.js";
import {
  clearAllAdminCookies,
  createAdminVerifiedToken,
  createGoogleSessionToken,
  getAdminSessionStatus,
  getAnalyticsAdminPath,
  getGoogleSessionFromRequest,
  isAnalyticsAdminConfigured,
  requireFullAdminAccess,
  setAdminVerifiedCookie,
  setGoogleSessionCookie,
  verifyAdminPin,
} from "../lib/analytics-session.js";
import { buildAnalyticsDashboard } from "../lib/analytics-stats.js";
import { readAnalyticsEvents } from "../lib/analytics-storage.js";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  isEmailAllowed,
  verifyOAuthState,
} from "../lib/google-oauth.js";
import { sanitizeText } from "../lib/sanitize.js";

const router = Router();

function parseRange(value: unknown): AnalyticsRange {
  const range = typeof value === "string" ? value : "7d";
  return ANALYTICS_RANGES.has(range as AnalyticsRange) ? (range as AnalyticsRange) : "7d";
}

function redirectToAdminPath(res: Parameters<typeof clearAllAdminCookies>[0], error?: string): void {
  const adminPath = getAnalyticsAdminPath();
  const url = error ? `${adminPath}?error=${encodeURIComponent(error)}` : adminPath;
  res.redirect(302, url);
}

function redirectToHomepage(res: Parameters<typeof clearAllAdminCookies>[0]): void {
  res.redirect(302, "/");
}

router.get("/analytics/admin/config", (_req, res) => {
  res.status(200).json({
    ok: true,
    adminPath: getAnalyticsAdminPath(),
    configured: isAnalyticsAdminConfigured(),
    authMethod: "google_pin",
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
      accessDenied: true,
    });
    return;
  }

  if (!status.googleAuthenticated) {
    res.status(401).json({
      ok: false,
      googleAuthenticated: false,
      adminVerified: false,
      accessDenied: false,
    });
    return;
  }

  res.status(200).json({
    ok: status.adminVerified,
    googleAuthenticated: true,
    adminVerified: status.adminVerified,
    accessDenied: false,
    email: status.email,
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
      reason: error instanceof Error ? error.message : "unknown",
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
      timestamp: new Date().toISOString(),
      reason: "oauth_denied",
    });
    redirectToHomepage(res);
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (!code || !verifyOAuthState(state)) {
    console.info("[analytics] admin login failure", {
      timestamp: new Date().toISOString(),
      reason: "oauth_state_invalid",
    });
    redirectToHomepage(res);
    return;
  }

  try {
    const googleUser = await exchangeGoogleCode(req, code);
    if (!googleUser) {
      console.info("[analytics] admin login failure", {
        timestamp: new Date().toISOString(),
        reason: "oauth_failed",
      });
      redirectToHomepage(res);
      return;
    }

    if (!isEmailAllowed(googleUser.email)) {
      console.info("[analytics] admin login failure", {
        timestamp: new Date().toISOString(),
        reason: "email_mismatch",
      });
      clearAllAdminCookies(res);
      redirectToHomepage(res);
      return;
    }

    const token = createGoogleSessionToken(googleUser.email);
    setGoogleSessionCookie(res, token);
    console.info("[analytics] admin login success", {
      timestamp: new Date().toISOString(),
      reason: "google_authenticated",
    });
    redirectToAdminPath(res);
  } catch (callbackError) {
    console.error("[analytics] google callback failed", {
      reason: callbackError instanceof Error ? callbackError.message : "unknown",
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
      timestamp: new Date().toISOString(),
      reason: "pin_failed",
    });
    res.status(401).json({ ok: false, error: "Invalid code" });
    return;
  }

  const verifiedToken = createAdminVerifiedToken(googleSession.email);
  setAdminVerifiedCookie(res, verifiedToken);
  console.info("[analytics] admin login success", {
    timestamp: new Date().toISOString(),
    reason: "pin_success",
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
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Dashboard unavailable." });
  }
});

export default router;
