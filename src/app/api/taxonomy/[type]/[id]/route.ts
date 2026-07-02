import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import { TAXONOMY_TABLES, isTaxonomyType } from "@/lib/taxonomy";
import { clean } from "@/lib/product-utils";

export const dynamic = "force-dynamic";

async function guard(request: NextRequest, type: string, id: string) {
  if (!verifySession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isTaxonomyType(type)) {
    return { error: NextResponse.json({ error: "Invalid type" }, { status: 400 }) };
  }
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return { error: NextResponse.json({ error: "Invalid id" }, { status: 400 }) };
  }
  return { type, numId } as const;
}

// Admin: update (name, enabled, sortOrder, extras)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const g = await guard(request, type, id);
  if ("error" in g) return g.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) patch.name = clean(body.name, 80);
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.sortOrder !== undefined) patch.sortOrder = Math.round(Number(body.sortOrder) || 0);
  if (g.type === "categories") {
    if (typeof body.image === "string") patch.image = body.image.slice(0, 100000);
    if (typeof body.description === "string") patch.description = clean(body.description, 1000);
  }
  if (g.type === "brands") {
    if (typeof body.logo === "string") patch.logo = body.logo.slice(0, 100000);
    if (typeof body.country === "string") patch.country = clean(body.country, 60);
    if (typeof body.description === "string") patch.description = clean(body.description, 1000);
    if (typeof body.website === "string") patch.website = clean(body.website, 200);
  }

  const table = TAXONOMY_TABLES[g.type];
  const [updated] = await db
    .update(table)
    .set(patch as never)
    .where(eq(table.id, g.numId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: updated });
}

// Admin: delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const g = await guard(request, type, id);
  if ("error" in g) return g.error;

  const table = TAXONOMY_TABLES[g.type];
  await db.delete(table).where(eq(table.id, g.numId));
  return NextResponse.json({ success: true });
}
