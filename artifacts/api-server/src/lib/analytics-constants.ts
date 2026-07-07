export const DEFAULT_ANALYTICS_ADMIN_PATH = "/garden-room-9274";

export const ANALYTICS_EVENT_NAME_MAX_LENGTH = 80;
export const ANALYTICS_METADATA_MAX_BYTES = 5 * 1024;

export const ANALYTICS_SESSION_COOKIE = "rr_analytics_session";
export const ADMIN_VERIFIED_COOKIE = "reportready_admin_verified";

/** Google OAuth step — time allowed to enter PIN. */
export const ANALYTICS_GOOGLE_SESSION_MS = 20 * 60 * 1000;

/** Full admin access after PIN verification. */
export const ADMIN_VERIFIED_SESSION_MS = 45 * 60 * 1000;

/** @deprecated Use ANALYTICS_GOOGLE_SESSION_MS or ADMIN_VERIFIED_SESSION_MS. */
export const ANALYTICS_SESSION_MS = ANALYTICS_GOOGLE_SESSION_MS;

export const ANALYTICS_EVENT_RATE_WINDOW_MS = 60 * 60 * 1000;
export const ANALYTICS_EVENT_RATE_MAX = 200;

export const ANALYTICS_LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
export const ANALYTICS_LOGIN_RATE_MAX = 5;

export const ALLOWED_ANALYTICS_EVENTS = new Set([
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
  "sheet_edit_click",
]);

export type AnalyticsRange = "today" | "7d" | "30d" | "all";

export const ANALYTICS_RANGES = new Set<AnalyticsRange>(["today", "7d", "30d", "all"]);
