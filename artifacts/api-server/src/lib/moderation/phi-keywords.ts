export const PHI_REJECTION_MESSAGE =
  "Please do not share patient names, MRNs, dates of birth, room numbers, or protected health information.";

/**
 * Patterns that suggest PHI. Intentionally narrow to avoid blocking normal nursing venting
 * (e.g. "my patient was stable" is fine).
 */
const PHI_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\bmrn\s*[:#]?\s*\d+/i,
  /\bmedical record (?:number|#|no\.?)/i,
  /\bdate of birth\b/i,
  /\bdob\s*[:/]\s*\d{1,2}/i,
  /\bpatient\s+name\s*[:/]/i,
  /\b(?:room|rm)\s*#?\s*\d{1,4}\b/i,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b.*\b(?:dob|born)\b/i,
];

export function containsPhiKeywords(...fields: Array<string | undefined | null>): boolean {
  for (const field of fields) {
    if (!field?.trim()) continue;
    for (const pattern of PHI_PATTERNS) {
      if (pattern.test(field)) {
        return true;
      }
    }
  }
  return false;
}

export function rejectIfPhi(
  ...fields: Array<string | undefined | null>
): { ok: true } | { ok: false; error: string } {
  if (containsPhiKeywords(...fields)) {
    return { ok: false, error: PHI_REJECTION_MESSAGE };
  }
  return { ok: true };
}
