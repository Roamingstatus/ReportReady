import type { FeedbackFeatureArea, FeedbackSeverity, FeedbackType } from "./feedback-constants.js";
import { escapeHtml } from "./sanitize.js";
import { getResendClient } from "./resend-client.js";

export interface FeedbackEmailInput {
  type: FeedbackType;
  featureArea: FeedbackFeatureArea;
  severity: FeedbackSeverity;
  message: string;
  pageUrl: string;
  timestamp: string;
  userAgent: string;
}

function buildPlainText(input: FeedbackEmailInput): string {
  return [
    "ReportReady Feedback",
    "",
    `Type: ${input.type}`,
    `Feature Area: ${input.featureArea}`,
    `Severity: ${input.severity}`,
    "",
    "Message:",
    input.message,
    "",
    `Page URL: ${input.pageUrl}`,
    `Timestamp: ${input.timestamp}`,
    `User Agent: ${input.userAgent}`,
    "",
    "App: ReportReady",
  ].join("\n");
}

function buildHtml(input: FeedbackEmailInput): string {
  const rows = [
    ["Type", input.type],
    ["Feature Area", input.featureArea],
    ["Severity", input.severity],
    ["Page URL", input.pageUrl],
    ["Timestamp", input.timestamp],
    ["User Agent", input.userAgent],
    ["App", "ReportReady"],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;font-weight:600;vertical-align:top;color:#334155">${escapeHtml(label)}</td><td style="padding:6px 0;color:#0f172a">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5">
    <h2 style="margin:0 0 16px">ReportReady Feedback</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">${tableRows}</table>
    <p style="margin:0 0 8px;font-weight:600">Message</p>
    <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:0">${escapeHtml(input.message)}</pre>
  </body>
</html>`;
}

export async function sendFeedbackEmail(input: FeedbackEmailInput): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Email delivery is not configured.");
  }

  const to = process.env.FEEDBACK_TO_EMAIL?.trim() || "support@nexusgarden.live";
  const from =
    process.env.FEEDBACK_FROM_EMAIL?.trim() ||
    "ReportReady <support@nexusgarden.live>";
  const subject = `[ReportReady Feedback] ${input.type} - ${input.severity}`;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    text: buildPlainText(input),
    html: buildHtml(input),
  });

  if (error) {
    throw new Error(error.message || "Failed to send feedback email.");
  }
}
