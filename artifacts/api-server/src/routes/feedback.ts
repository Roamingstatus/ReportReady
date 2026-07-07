import { Router } from "express";
import { feedbackRateLimit } from "../lib/feedback-rate-limit.js";
import { validateFeedbackBody } from "../lib/feedback-validation.js";
import { sanitizeText } from "../lib/sanitize.js";
import { sendFeedbackEmail } from "../lib/send-feedback-email.js";

const router = Router();

router.all("/feedback", (req, res, next) => {
  if (req.method === "POST") {
    next();
    return;
  }
  res.set("Allow", "POST");
  res.status(405).json({ ok: false, error: "Method not allowed." });
});

router.post("/feedback", feedbackRateLimit, async (req, res) => {
  const validation = validateFeedbackBody(req.body);
  if (!validation.ok) {
    res.status(validation.status).json({ ok: false, error: validation.error });
    return;
  }

  const { data } = validation;

  if (data.isHoneypotTriggered) {
    console.info("[feedback] honeypot", {
      timestamp: data.timestamp,
      featureArea: data.featureArea,
      severity: data.severity,
      outcome: "ignored",
    });
    res.status(200).json({ ok: true });
    return;
  }

  const userAgent = sanitizeText(req.get("user-agent") ?? "unknown", 500);

  try {
    await sendFeedbackEmail({
      type: data.type,
      featureArea: data.featureArea,
      severity: data.severity,
      message: data.message,
      pageUrl: data.pageUrl,
      timestamp: data.timestamp,
      userAgent,
    });

    console.info("[feedback] sent", {
      timestamp: data.timestamp,
      featureArea: data.featureArea,
      severity: data.severity,
      outcome: "success",
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[feedback] send failed", {
      timestamp: data.timestamp,
      featureArea: data.featureArea,
      severity: data.severity,
      outcome: "failure",
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({
      ok: false,
      error: "Feedback could not be sent. Please try again.",
    });
  }
});

export default router;
