import {
  DEFAULT_FEATURE_AREA,
  DEFAULT_SEVERITY,
  DEFAULT_TYPE,
  FEATURE_AREAS,
  FEEDBACK_ALLOWED_BODY_KEYS,
  FEEDBACK_TYPES,
  LIMITS,
  SEVERITIES,
  type FeedbackFeatureArea,
  type FeedbackSeverity,
  type FeedbackType,
} from "./feedback-constants.js";
import { sanitizeText } from "./sanitize.js";

export interface ValidatedFeedback {
  type: FeedbackType;
  featureArea: FeedbackFeatureArea;
  severity: FeedbackSeverity;
  message: string;
  pageUrl: string;
  timestamp: string;
  isHoneypotTriggered: boolean;
}

export type FeedbackValidationResult =
  | { ok: true; data: ValidatedFeedback }
  | { ok: false; error: string; status: number };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringFieldTooLong(value: unknown, max: number): boolean {
  return typeof value === "string" && value.length > max;
}

function resolveEnumField<T extends string>(
  value: unknown,
  allowed: readonly T[],
  defaultValue: T,
  fieldName: string,
  maxLength: number,
): { ok: true; value: T } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: defaultValue };
  }

  if (typeof value !== "string") {
    return { ok: false, error: `Invalid ${fieldName}.` };
  }

  if (value.length > maxLength) {
    return { ok: false, error: `${fieldName} is too long.` };
  }

  if (!allowed.includes(value as T)) {
    return { ok: false, error: `Invalid ${fieldName}.` };
  }

  return { ok: true, value: value as T };
}

export function validateFeedbackBody(body: unknown): FeedbackValidationResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }

  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length === 0) {
    return { ok: false, error: "Invalid request body.", status: 400 };
  }

  for (const key of keys) {
    if (!FEEDBACK_ALLOWED_BODY_KEYS.has(key)) {
      return { ok: false, error: "Invalid request fields.", status: 400 };
    }
  }

  if (stringFieldTooLong(record.type, LIMITS.typeMax)) {
    return { ok: false, error: "Type is too long.", status: 400 };
  }
  if (stringFieldTooLong(record.featureArea, LIMITS.featureAreaMax)) {
    return { ok: false, error: "Feature area is too long.", status: 400 };
  }
  if (stringFieldTooLong(record.severity, LIMITS.severityMax)) {
    return { ok: false, error: "Severity is too long.", status: 400 };
  }
  if (stringFieldTooLong(record.pageUrl, LIMITS.pageUrlMax)) {
    return { ok: false, error: "Page URL is too long.", status: 400 };
  }
  if (stringFieldTooLong(record.timestamp, LIMITS.timestampMax)) {
    return { ok: false, error: "Timestamp is too long.", status: 400 };
  }

  const typeResult = resolveEnumField(
    record.type,
    FEEDBACK_TYPES,
    DEFAULT_TYPE,
    "feedback type",
    LIMITS.typeMax,
  );
  if (!typeResult.ok) {
    return { ok: false, error: typeResult.error, status: 400 };
  }

  const featureAreaResult = resolveEnumField(
    record.featureArea,
    FEATURE_AREAS,
    DEFAULT_FEATURE_AREA,
    "feature area",
    LIMITS.featureAreaMax,
  );
  if (!featureAreaResult.ok) {
    return { ok: false, error: featureAreaResult.error, status: 400 };
  }

  const severityResult = resolveEnumField(
    record.severity,
    SEVERITIES,
    DEFAULT_SEVERITY,
    "severity",
    LIMITS.severityMax,
  );
  if (!severityResult.ok) {
    return { ok: false, error: severityResult.error, status: 400 };
  }

  if (!isNonEmptyString(record.message)) {
    return { ok: false, error: "Message is required.", status: 400 };
  }

  if (record.message.length > LIMITS.messageMax) {
    return { ok: false, error: "Message is too long.", status: 400 };
  }

  const message = sanitizeText(record.message, LIMITS.messageMax);
  if (message.length < LIMITS.messageMin) {
    return { ok: false, error: "Message must be at least 5 characters.", status: 400 };
  }

  const pageUrl = isNonEmptyString(record.pageUrl)
    ? sanitizeText(record.pageUrl, LIMITS.pageUrlMax)
    : "unknown";
  const timestamp = isNonEmptyString(record.timestamp)
    ? sanitizeText(record.timestamp, LIMITS.timestampMax)
    : new Date().toISOString();

  const isHoneypotTriggered =
    typeof record.companyWebsite === "string" && record.companyWebsite.trim().length > 0;

  return {
    ok: true,
    data: {
      type: typeResult.value,
      featureArea: featureAreaResult.value,
      severity: severityResult.value,
      message,
      pageUrl,
      timestamp,
      isHoneypotTriggered,
    },
  };
}
