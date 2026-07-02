import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import { TAXONOMY_TABLES, isTaxonomyType } from "@/lib/taxonomy";
import { clean } from "@/lib/product-utils";

export const dynamic = "force-dynamic";

// Admin: create a taxonomy item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  if (!verifySession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { type } = await params;
  if (!isTaxonomyType(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = clean(body.name, 80);
  if (name.length < 2) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const values: Record<string, unknown> = {
    name,
    sortOrder: Math.round(Number(body.sortOrder) || 0),
    enabled: body.enabled !== false,
  };
  if (type === "categories") {
    values.image = String(body.image ?? "").slice(0, 100000);
    values.description = clean(body.description, 1000);
  }
  if (type === "brands") {
    values.logo = String(body.logo ?? "").slice(0, 100000);
    values.country = clean(body.country, 60);
    values.description = clean(body.description, 1000);
    values.website = clean(body.website, 200);
  }

  const table = TAXONOMY_TABLES[type];
  const [inserted] = await db.insert(table).values(values as never).returning();
  return NextResponse.json({ item: inserted }, { status: 201 });
}
