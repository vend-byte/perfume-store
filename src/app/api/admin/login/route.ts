import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  safeEquals,
} from "@/lib/admin-auth";

// Simple in-memory brute-force protection (per server instance)
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  // Brute-force lockout check
  const record = attempts.get(ip);
  if (record && record.lockedUntil > Date.now()) {
    const minutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${minutes} minute(s).` },
      { status: 429 }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = String(body.username ?? "");
  const password = String(body.password ?? "");

  const validUsername = process.env.ADMIN_USERNAME || "admin";
  const validPassword = process.env.ADMIN_PASSWORD || "admin@2026";

  const ok =
    safeEquals(username, validUsername) && safeEquals(password, validPassword);

  if (!ok) {
    const current = attempts.get(ip) ?? { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_MS;
      current.count = 0;
    }
    attempts.set(ip, current);
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  attempts.delete(ip);

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = signSession(expiresAt);

  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // SameSite=None so the session also works when the site is viewed
    // inside an embedded preview frame; requires Secure (HTTPS).
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
  return response;
}
