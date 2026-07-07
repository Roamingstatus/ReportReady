import crypto from "node:crypto";

export function getAdminAccessPin(): string | null {
  const pin = process.env.ADMIN_ACCESS_PIN?.trim();
  return pin && pin.length > 0 ? pin : null;
}

export function isAdminPinConfigured(): boolean {
  return Boolean(getAdminAccessPin());
}

export function verifyAdminPin(pin: string): boolean {
  const expected = getAdminAccessPin();
  if (!expected || !pin) return false;

  const provided = Buffer.from(pin.trim());
  const target = Buffer.from(expected);
  if (provided.length !== target.length) return false;
  return crypto.timingSafeEqual(provided, target);
}

// Future: phone OTP via Twilio Verify (not enabled)
// TWILIO_ACCOUNT_SID=
// TWILIO_AUTH_TOKEN=
// TWILIO_VERIFY_SERVICE_SID=
// ADMIN_PHONE_NUMBER=
