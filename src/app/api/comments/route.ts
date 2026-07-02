import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Light per-IP rate limiting: max 5 comments per 10 minutes
const postTimes = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_POSTS = 5;

function clean(input: string, maxLen: number): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export async function GET() {
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.approved, true))
    .orderBy(desc(comments.createdAt))
    .limit(50);

  return NextResponse.json({ comments: rows });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  // Rate limit
  const now = Date.now();
  const recent = (postTimes.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_POSTS) {
    return NextResponse.json(
      { error: "You're posting too fast. Please wait a few minutes." },
      { status: 429 }
    );
  }

  let body: { name?: string; message?: string; rating?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = clean(String(body.name ?? ""), 60);
  const message = clean(String(body.message ?? ""), 500);
  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Please enter your name (at least 2 characters)." },
      { status: 400 }
    );
  }
  if (message.length < 3) {
    return NextResponse.json(
      { error: "Please write a comment (at least 3 characters)." },
      { status: 400 }
    );
  }

  recent.push(now);
  postTimes.set(ip, recent);

  const [inserted] = await db
    .insert(comments)
    .values({ name, message, rating })
    .returning();

  return NextResponse.json({ comment: inserted }, { status: 201 });
}
