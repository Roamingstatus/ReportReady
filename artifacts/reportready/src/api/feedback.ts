export const FEEDBACK_TYPES = [
  "Bug Report",
  "Feature Request",
  "Template Suggestion",
  "UI Feedback",
  "General Feedback",
] as const;

export const FEEDBACK_FEATURE_AREAS = [
  "Homepage",
  "Templates",
  "Builder",
  "Printing",
  "Coming Soon",
  "Account",
  "Other",
] as const;

export const FEEDBACK_SEVERITIES = ["Low", "Medium", "High"] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export type FeedbackFeatureArea = (typeof FEEDBACK_FEATURE_AREAS)[number];
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export const FEEDBACK_MESSAGE_MIN_LENGTH = 5;
export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

export interface FeedbackPayload {
  type: FeedbackType;
  featureArea: FeedbackFeatureArea;
  severity: FeedbackSeverity;
  message: string;
  pageUrl: string;
  timestamp: string;
  companyWebsite?: string;
}

export interface FeedbackApiResponse {
  ok: boolean;
  error?: string;
}
