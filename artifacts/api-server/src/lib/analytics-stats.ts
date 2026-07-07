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
  };
}
