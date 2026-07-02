import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Admin-only: delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const commentId = Number(id);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db.delete(comments).where(eq(comments.id, commentId));
  return NextResponse.json({ success: true });
}
