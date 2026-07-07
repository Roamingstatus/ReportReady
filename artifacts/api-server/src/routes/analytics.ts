import { Router } from "express";
import { analyticsEventRateLimit } from "../lib/analytics-rate-limit.js";
import { appendAnalyticsEvent } from "../lib/analytics-storage.js";
import { getBrowserFamily, getDeviceType } from "../lib/analytics-user-agent.js";
import { validateAnalyticsEventBody } from "../lib/analytics-validation.js";
import { sanitizeText } from "../lib/sanitize.js";

const router = Router();

router.all("/analytics/event", (req, res, next) => {
  if (req.method === "POST") {
    next();
    return;
  }
  res.set("Allow", "POST");
  res.status(405).json({ ok: false, error: "Method not allowed." });
});

router.post("/analytics/event", analyticsEventRateLimit, async (req, res) => {
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
      browserFamily: getBrowserFamily(userAgent),
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[analytics] event store failed", {
      eventName: data.eventName,
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Event could not be recorded." });
  }
});

export default router;
