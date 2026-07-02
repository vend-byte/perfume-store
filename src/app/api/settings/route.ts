import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return NextResponse.json({ settings: map });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const entries = Object.entries(body).filter(
    ([k, v]) => typeof k === "string" && k.length <= 80 && typeof v === "string"
  ) as [string, string][];

  for (const [key, value] of entries) {
    await db
      .insert(settings)
      .values({ key, value: value.slice(0, 5000) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: value.slice(0, 5000) },
      });
  }

  return NextResponse.json({ success: true, updated: entries.length });
}
