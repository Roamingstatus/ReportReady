// Opens a free sheet in the builder for customization.
// Builder is inactive today — redirects to the coming-soon page and stores intent for later.

import { trackEvent } from "@/lib/analytics";

export const BUILDER_COMING_SOON_PATH = "/builder";
export const SHEET_EDIT_INTENT_KEY = "reportready_sheet_edit_intent";

/** Free interactive sheets that support edit-in-builder (homepage + gallery). */
export const FREE_EDITABLE_SHEET_IDS = [
  "icu-brain",
  "quick-dirty",
  "controlled-chaos",
  "mission-control",
  "vitals-vibes",
  "the-night-shift-special",
] as const;

export type FreeEditableSheetId = (typeof FREE_EDITABLE_SHEET_IDS)[number];

export interface SheetEditIntent {
  templateId: string;
  sourcePath: string;
  requestedAt: string;
}

export function isFreeEditableSheetId(value: string): value is FreeEditableSheetId {
  return (FREE_EDITABLE_SHEET_IDS as readonly string[]).includes(value);
}

export function saveSheetEditIntent(templateId: string): SheetEditIntent {
  const intent: SheetEditIntent = {
    templateId,
    sourcePath: window.location.pathname,
    requestedAt: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(SHEET_EDIT_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // sessionStorage may be unavailable; redirect still works.
  }

  return intent;
}

export function getSheetEditIntent(): SheetEditIntent | null {
  try {
    const raw = sessionStorage.getItem(SHEET_EDIT_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SheetEditIntent;
    if (typeof parsed.templateId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSheetEditIntent(): void {
  try {
    sessionStorage.removeItem(SHEET_EDIT_INTENT_KEY);
  } catch {
    // ignore
  }
}

export function getBuilderComingSoonUrl(templateId: string): string {
  const url = new URL(BUILDER_COMING_SOON_PATH, window.location.origin);
  url.searchParams.set("edit", templateId);
  return `${url.pathname}${url.search}`;
}

/**
 * Start editing a free sheet. Stores intent locally, then redirects to the builder
 * coming-soon page until the builder is live.
 */
export function beginSheetEdit(templateId: string): void {
  saveSheetEditIntent(templateId);
  trackEvent("sheet_edit_click", { templateId });
  window.location.assign(getBuilderComingSoonUrl(templateId));
}
