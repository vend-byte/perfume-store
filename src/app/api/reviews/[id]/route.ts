import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import { clean } from "@/lib/product-utils";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  return verifySession(request.cookies.get(SESSION_COOKIE)?.value);
}

// Admin: approve / hide / pin / reply
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { approved?: boolean; pinned?: boolean; adminReply?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch: Partial<{ approved: boolean; pinned: boolean; adminReply: string }> = {};
  if (typeof body.approved === "boolean") patch.approved = body.approved;
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
  if (typeof body.adminReply === "string") patch.adminReply = clean(body.adminReply, 1000);

  const [updated] = await db
    .update(reviews)
    .set(patch)
    .where(eq(reviews.id, reviewId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ review: updated });
}

// Admin: delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(reviews).where(eq(reviews.id, reviewId));
  return NextResponse.json({ success: true });
}
