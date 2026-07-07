const SCRIPT_TAG_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(value: string, maxLength = 2000): string {
  return value
    .replace(CONTROL_CHARS_PATTERN, "")
    .replace(SCRIPT_TAG_PATTERN, "")
    .replace(HTML_TAG_PATTERN, "")
    .trim()
    .slice(0, maxLength);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
