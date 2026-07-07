import crypto from "node:crypto";
import type { Request } from "express";

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

export function hashIp(ip: string): string {
  const secret = process.env.ANALYTICS_SECRET || "dev-analytics-secret";
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}
