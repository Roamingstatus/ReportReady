export function getDeviceType(userAgent: string): "mobile" | "tablet" | "desktop" | "unknown" {
  const ua = userAgent.toLowerCase();
  if (!ua || ua === "unknown") return "unknown";
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

export function getBrowserFamily(userAgent: string): string {
  const ua = userAgent;
  if (!ua || ua === "unknown") return "unknown";
  if (/Edg\//.test(ua)) return "edge";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}
