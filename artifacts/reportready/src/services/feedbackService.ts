import type { FeedbackApiResponse, FeedbackPayload } from "@/api/feedback";
import { FEEDBACK_MESSAGE_MAX_LENGTH, FEEDBACK_MESSAGE_MIN_LENGTH } from "@/api/feedback";

const FEEDBACK_ENDPOINT = "/api/feedback";

export interface SubmitFeedbackInput {
  type: FeedbackPayload["type"];
  featureArea: FeedbackPayload["featureArea"];
  severity: FeedbackPayload["severity"];
  message: string;
  companyWebsite?: string;
}

function mapFeedbackError(status: number, apiError?: string): string {
  if (status === 429) {
    return "Too many submissions. Please try again later.";
  }
  if (apiError && apiError.length <= 120) {
    return apiError;
  }
  return "Feedback could not be sent. Please try again.";
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  const trimmedMessage = input.message.trim();

  if (!trimmedMessage) {
    throw new Error("Message is required.");
  }
  if (trimmedMessage.length < FEEDBACK_MESSAGE_MIN_LENGTH) {
    throw new Error("Message must be at least 5 characters.");
  }
  if (trimmedMessage.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
    throw new Error("Message is too long.");
  }

  const payload: FeedbackPayload = {
    type: input.type,
    featureArea: input.featureArea,
    severity: input.severity,
    message: trimmedMessage,
    pageUrl: typeof window !== "undefined" ? window.location.href : "",
    timestamp: new Date().toISOString(),
    companyWebsite: input.companyWebsite ?? "",
  };

  const response = await fetch(FEEDBACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as FeedbackApiResponse | null;

  if (!response.ok || data?.ok === false) {
    throw new Error(mapFeedbackError(response.status, data?.error));
  }
}
