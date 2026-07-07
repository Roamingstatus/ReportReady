export type AnalyticsRange = "today" | "7d" | "30d" | "all";

export interface AnalyticsDashboard {
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
  recentEvents: Array<{
    id: string;
    guestId: string;
    eventName: string;
    metadata: Record<string, unknown>;
    path: string;
    referrer: string;
    userAgent: string;
    deviceType: string;
    browserFamily: string;
    createdAt: string;
  }>;
  trafficByPage: Array<{ path: string; count: number }>;
}

export interface AdminSessionState {
  googleAuthenticated: boolean;
  adminVerified: boolean;
  accessDenied: boolean;
  email?: string;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed.");
  }
  return data;
}

export async function checkAnalyticsSession(): Promise<AdminSessionState> {
  const response = await fetch("/api/analytics/admin/session", {
    credentials: "include",
  });

  if (response.status === 403) {
    return { googleAuthenticated: false, adminVerified: false, accessDenied: true };
  }

  if (!response.ok) {
    return { googleAuthenticated: false, adminVerified: false, accessDenied: false };
  }

  const data = await parseJsonResponse<{
    googleAuthenticated: boolean;
    adminVerified: boolean;
    accessDenied?: boolean;
    email?: string;
  }>(response);

  return {
    googleAuthenticated: data.googleAuthenticated,
    adminVerified: data.adminVerified,
    accessDenied: data.accessDenied ?? false,
    email: data.email,
  };
}

export function getGoogleAuthStartUrl(): string {
  return "/api/analytics/admin/google/start";
}

export async function verifyAdminPin(pin: string): Promise<void> {
  const response = await fetch("/api/analytics/admin/verify-pin", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });

  const data = (await response.json()) as { error?: string };

  if (response.status === 429) {
    throw new Error("Too many attempts. Try again later.");
  }

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Invalid code");
  }
}

export async function logoutAnalyticsAdmin(): Promise<void> {
  const response = await fetch("/api/analytics/admin/logout", {
    method: "POST",
    credentials: "include",
  });
  await parseJsonResponse(response);
}

export async function fetchAnalyticsDashboard(range: AnalyticsRange): Promise<AnalyticsDashboard> {
  const response = await fetch(`/api/analytics/admin/dashboard?range=${encodeURIComponent(range)}`, {
    credentials: "include",
  });
  const data = await parseJsonResponse<{ ok: boolean; dashboard: AnalyticsDashboard }>(response);
  return data.dashboard;
}
