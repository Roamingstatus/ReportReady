import {
  ALLOWED_ANALYTICS_EVENTS,
  ANALYTICS_EVENT_NAME_MAX_LENGTH,
  ANALYTICS_METADATA_MAX_BYTES,
} from "./analytics-constants.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ValidatedAnalyticsEvent {
  guestId: string;
  eventName: string;
  metadata: Record<string, unknown>;
  path: string;
  referrer: string;
}

type ValidationResult =
  | { ok: true; data: ValidatedAnalyticsEvent }
  | { ok: false; status: number; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function validateAnalyticsEventBody(body: unknown): ValidationResult {
  if (!isPlainObject(body)) {
    return { ok: false, status: 400, error: "Invalid request body." };
  }

  const guestId = sanitizeString(body.guestId, 64);
  if (!UUID_RE.test(guestId)) {
    return { ok: false, status: 400, error: "Invalid guest id." };
  }

  const eventName = sanitizeString(body.eventName, ANALYTICS_EVENT_NAME_MAX_LENGTH);
  if (!eventName) {
    return { ok: false, status: 400, error: "Event name is required." };
  }
  if (!ALLOWED_ANALYTICS_EVENTS.has(eventName)) {
    return { ok: false, status: 400, error: "Invalid event name." };
  }

  let metadata: Record<string, unknown> = {};
  if (body.metadata !== undefined) {
    if (!isPlainObject(body.metadata)) {
      return { ok: false, status: 400, error: "Invalid metadata." };
    }
    metadata = body.metadata;
    const metadataBytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
    if (metadataBytes > ANALYTICS_METADATA_MAX_BYTES) {
      return { ok: false, status: 400, error: "Metadata payload too large." };
    }
  }

  const pathValue = sanitizeString(body.path ?? metadata.path, 500);
  const referrer = sanitizeString(body.referrer ?? metadata.referrer, 500);

  return {
    ok: true,
    data: {
      guestId,
      eventName,
      metadata,
      path: pathValue,
      referrer,
    },
  };
}

export function validateAnalyticsPayloadSize(rawBody: string): ValidationResult | { ok: true } {
  if (Buffer.byteLength(rawBody, "utf8") > ANALYTICS_METADATA_MAX_BYTES + 2048) {
    return { ok: false, status: 413, error: "Payload too large." };
  }
  return { ok: true };
}
