export interface ReportReadyConfig {
  buyMeCoffeeUrl?: string;
  analyticsAdminPath?: string;
}

export function getReportReadyConfig(): ReportReadyConfig {
  return window.__REPORTREADY_CONFIG__ ?? {};
}

export const DEFAULT_ANALYTICS_ADMIN_PATH = "/garden-room-9274";

export function getAnalyticsAdminPath(): string {
  return getReportReadyConfig().analyticsAdminPath || DEFAULT_ANALYTICS_ADMIN_PATH;
}

export function isAnalyticsAdminPath(pathname: string): boolean {
  const adminPath = getAnalyticsAdminPath();
  return pathname === adminPath || pathname.startsWith(`${adminPath}/`);
}
