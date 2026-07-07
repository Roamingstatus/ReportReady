export const FEEDBACK_TYPES = [
  "Bug Report",
  "Feature Request",
  "Template Suggestion",
  "UI Feedback",
  "General Feedback",
] as const;

export const FEATURE_AREAS = [
  "Homepage",
  "Templates",
  "Builder",
  "Printing",
  "Coming Soon",
  "Account",
  "Other",
] as const;

export const SEVERITIES = ["Low", "Medium", "High"] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export type FeedbackFeatureArea = (typeof FEATURE_AREAS)[number];
export type FeedbackSeverity = (typeof SEVERITIES)[number];

export const DEFAULT_TYPE: FeedbackType = "General Feedback";
export const DEFAULT_FEATURE_AREA: FeedbackFeatureArea = "Other";
export const DEFAULT_SEVERITY: FeedbackSeverity = "Medium";

export const FEEDBACK_ALLOWED_BODY_KEYS = new Set([
  "type",
  "featureArea",
  "severity",
  "message",
  "pageUrl",
  "timestamp",
  "companyWebsite",
]);

export const LIMITS = {
  messageMin: 5,
  messageMax: 2000,
  typeMax: 50,
  featureAreaMax: 50,
  severityMax: 20,
  pageUrlMax: 500,
  timestampMax: 100,
} as const;
