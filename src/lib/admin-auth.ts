import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "tsa_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hour session timeout

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "change-me-in-production";
}

/** Create a signed, expiring session token (HMAC-SHA256). */
export function signSession(expiresAt: number): string {
  const payload = String(expiresAt);
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** Verify a session token signature and expiry using constant-time comparison. */
export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  return Number(payload) > Date.now();
}

/** Constant-time string comparison to prevent timing attacks. */
export function safeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    // Compare anyway to keep timing constant
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}
