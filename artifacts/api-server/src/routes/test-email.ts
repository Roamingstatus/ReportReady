import { Router } from "express";
import { feedbackRateLimit } from "../lib/feedback-rate-limit.js";
import { getResendClient } from "../lib/resend-client.js";

const router = Router();

const TEST_FROM = "support@nexusgarden.live";
const TEST_TO = "support@nexusgarden.live";
const TEST_SUBJECT = "ReportReady Email Test";
const TEST_BODY = "If you received this email, Resend is configured correctly.";

router.post("/test-email", feedbackRateLimit, async (_req, res) => {
  const resend = getResendClient();
  if (!resend) {
    res.status(500).json({ ok: false, error: "Email delivery is not configured." });
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: TEST_FROM,
      to: [TEST_TO],
      subject: TEST_SUBJECT,
      text: TEST_BODY,
    });

    if (error) {
      throw new Error(error.message || "Failed to send test email.");
    }

    console.info("[test-email] sent", { to: TEST_TO });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[test-email] send failed", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to send test email.",
    });
  }
});

export default router;
