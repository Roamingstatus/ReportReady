import type { AnalyticsRange } from "./analytics-constants.js";
import type { AnalyticsEventRecord } from "./analytics-storage.js";

export interface AnalyticsDashboardData {
  range: AnalyticsRange;
  cards: {
    totalVisits: number;
    uniqueGuests: number;
    visitsToday: number;
    templateViews: number;
    printClicks: number;
    feedbackOpens: number;
    feedbackSubmissions: number;
    buyMeCoffeeClicks: number;
    credantaClicks: number;
    comingSoonClicks: number;
    breakroomVisits: number;
  };
  topTemplatesViewed: Array<{ templateId: string; count: number }>;
  topPrintedTemplates: Array<{ templateId: string; count: number }>;
  recentEvents: AnalyticsEventRecord[];
  trafficByPage: Array<{ path: string; count: number }>;
  guestVisitors: GuestVisitorRow[];
}

export interface GuestVisitorRow {
  guestId: string;
  firstSeen: string;
  lastSeen: string;
  visitCount: number;
  deviceType: string;
  browserFamily: string;
  recentPaths: string[];
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function filterByRange(events: AnalyticsEventRecord[], range: AnalyticsRange): AnalyticsEventRecord[] {
  if (range === "all") return events;

  const now = new Date();
  let cutoff: Date;

  if (range === "today") {
    cutoff = startOfUtcDay(now);
  } else if (range === "7d") {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return events.filter((event) => new Date(event.createdAt) >= cutoff);
}

function countEvents(events: AnalyticsEventRecord[], eventName: string): number {
  return events.filter((event) => event.eventName === eventName).length;
}

function uniqueGuests(events: AnalyticsEventRecord[]): number {
  return new Set(events.map((event) => event.guestId)).size;
}

function topTemplates(
  events: AnalyticsEventRecord[],
  eventName: "template_view" | "print_click",
  limit = 10,
): Array<{ templateId: string; count: number }> {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.eventName !== eventName) continue;
    const templateId =
      typeof event.metadata.templateId === "string"
        ? event.metadata.templateId
        : typeof event.metadata.template_id === "string"
          ? event.metadata.template_id
          : "unknown";
    counts.set(templateId, (counts.get(templateId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([templateId, count]) => ({ templateId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function trafficByPage(events: AnalyticsEventRecord[], limit = 12): Array<{ path: string; count: number }> {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.eventName !== "page_view") continue;
    const pagePath = event.path || "/";
    counts.set(pagePath, (counts.get(pagePath) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

interface GuestAccumulator {
  firstSeen: string;
  lastSeen: string;
  visitCount: number;
  deviceType: string;
  browserFamily: string;
  pathsByRecency: string[];
}

function buildGuestVisitors(events: AnalyticsEventRecord[], limit = 100): GuestVisitorRow[] {
  const byGuest = new Map<string, GuestAccumulator>();

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
        pathsByRecency: event.eventName === "page_view" ? [pagePath] : [],
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
        ...existing.pathsByRecency.filter((p) => p !== pagePath),
      ].slice(0, 5);
    }
  }

  return [...byGuest.entries()]
    .map(([guestId, acc]) => ({
      guestId,
      firstSeen: acc.firstSeen,
      lastSeen: acc.lastSeen,
      visitCount: acc.visitCount,
      deviceType: acc.deviceType,
      browserFamily: acc.browserFamily,
      recentPaths: acc.pathsByRecency,
    }))
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, limit);
}

export function buildAnalyticsDashboard(
  events: AnalyticsEventRecord[],
  range: AnalyticsRange,
): AnalyticsDashboardData {
  const filtered = filterByRange(events, range);
  const todayStart = startOfUtcDay(new Date());
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
      breakroomVisits: countEvents(filtered, "breakroom_visit"),
    },
    topTemplatesViewed: topTemplates(filtered, "template_view"),
    topPrintedTemplates: topTemplates(filtered, "print_click"),
    recentEvents: [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50),
    trafficByPage: trafficByPage(filtered),
    guestVisitors: buildGuestVisitors(filtered),
  };
}
