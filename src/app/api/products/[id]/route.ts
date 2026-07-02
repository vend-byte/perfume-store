import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import { clean, parseSizes, parseIds, parseImages, syncJunctions } from "@/lib/product-utils";

export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest): boolean {
  return verifySession(request.cookies.get(SESSION_COOKIE)?.value);
}

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Public: fetch single product + count a view
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = parseId(id);
  if (!productId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [row] = await db
    .update(products)
    .set({ views: sql`${products.views} + 1` })
    .where(eq(products.id, productId))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product: row });
}

// Admin: update product (code is never editable)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const productId = parseId(id);
  if (!productId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sizes = parseSizes(body.sizes);
  if (sizes.length === 0) {
    return NextResponse.json(
      { error: "At least one size with a price is required." },
      { status: 400 }
    );
  }

  const images = parseImages(body.images);

  const [updated] = await db
    .update(products)
    .set({
      name: clean(body.name, 140),
      brand: clean(body.brand, 80),
      category: clean(body.category, 60),
      gender: clean(body.gender, 20) || "Unisex",
      fragranceFamily: clean(body.fragranceFamily, 80),
      description: clean(body.description, 3000),
      topNotes: clean(body.topNotes, 200),
      middleNotes: clean(body.middleNotes, 200),
      baseNotes: clean(body.baseNotes, 200),
      image: images[0] ?? String(body.image ?? "").slice(0, 100000),
      images,
      video: String(body.video ?? "").slice(0, 1000),
      status: clean(body.status, 30) || "In Stock",
      sizes,
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      brandId: body.brandId ? Number(body.brandId) : null,
    })
    .where(eq(products.id, productId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await syncJunctions(productId, parseIds(body.familyIds), parseIds(body.collectionIds));

  return NextResponse.json({ product: updated });
}

// Admin: delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const productId = parseId(id);
  if (!productId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(products).where(eq(products.id, productId));
  await syncJunctions(productId, [], []); // remove junction rows
  return NextResponse.json({ success: true });
}
