// Analytics are anonymous and used only to improve ReportReady.

const GUEST_ID_KEY = "reportready_guest_id";
const ANALYTICS_ENDPOINT = "/api/analytics/event";

export type AnalyticsEventName =
  | "page_view"
  | "template_view"
  | "print_click"
  | "feedback_open"
  | "feedback_submit"
  | "buy_me_coffee_click"
  | "credanta_promo_click"
  | "nexusgarden_link_click"
  | "coming_soon_preview_click"
  | "breakroom_visit"
  | "breakroom_post_created"
  | "breakroom_reaction"
  | "sheet_edit_click";

export type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

function createGuestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing) return existing;
    const guestId = createGuestId();
    localStorage.setItem(GUEST_ID_KEY, guestId);
    return guestId;
  } catch {
    return createGuestId();
  }
}

function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

function buildPayload(eventName: AnalyticsEventName, metadata?: AnalyticsMetadata) {
  return {
    guestId: getGuestId(),
    eventName,
    path: window.location.pathname,
    referrer: document.referrer || "",
    metadata: {
      ...metadata,
      deviceType: getDeviceType(),
    },
  };
}

export function trackEvent(eventName: AnalyticsEventName, metadata?: AnalyticsMetadata): void {
  const payload = buildPayload(eventName, metadata);

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
      if (sent) return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Silent failure — analytics must never interrupt the app.
  });
}

export function trackPageView(path = window.location.pathname): void {
  trackEvent("page_view", { path });
}

export function startLegacyPageViewTracking(): () => void {
  let lastPath = window.location.pathname;
  trackPageView(lastPath);

  const intervalId = window.setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      trackPageView(currentPath);
    }
  }, 750);

  const onPopState = () => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      trackPageView(currentPath);
    }
  };

  window.addEventListener("popstate", onPopState);
  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener("popstate", onPopState);
  };
}
