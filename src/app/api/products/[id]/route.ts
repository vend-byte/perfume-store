import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import {
  clean,
  parseSizes,
  parseIds,
  parseImages,
  syncJunctions,
  resolveBrand,
  resolveCategory,
  resolveFamilyIds,
  generateUniqueSlug,
} from "@/lib/product-utils";

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

  const name = clean(body.name, 140);
  const sizes = parseSizes(body.sizes);
  const isDraft = body.draft === true;

  if (!isDraft && sizes.length === 0) {
    return NextResponse.json(
      { error: "At least one size with a price is required." },
      { status: 400 }
    );
  }

  const images = parseImages(body.images);
  const brand = await resolveBrand(body.brandId, body.brand);
  const category = await resolveCategory(body.categoryId, body.category);

  // Only regenerate the slug if the admin explicitly changed the name or slug field.
  const requestedSlug = clean(body.slug, 160);
  const slug = requestedSlug
    ? await generateUniqueSlug(requestedSlug, productId)
    : name
    ? await generateUniqueSlug(name, productId)
    : undefined;

  const [updated] = await db
    .update(products)
    .set({
      name,
      ...(slug ? { slug } : {}),
      brand: brand.name,
      brandId: brand.id,
      category: category.name,
      categoryId: category.id,
      gender: clean(body.gender, 20) || "Unisex",
      fragranceFamily: clean(body.fragranceFamily, 80),
      description: clean(body.description, 3000),
      topNotes: clean(body.topNotes, 200),
      middleNotes: clean(body.middleNotes, 200),
      baseNotes: clean(body.baseNotes, 200),
      concentration: clean(body.concentration, 40),
      longevity: clean(body.longevity, 40),
      sillage: clean(body.sillage, 40),
      season: clean(body.season, 60),
      occasion: clean(body.occasion, 60),
      image: images[0] ?? String(body.image ?? "").slice(0, 100000),
      images,
      video: String(body.video ?? "").slice(0, 1000),
      status: clean(body.status, 30) || "In Stock",
      draft: isDraft,
      sizes,
      seoTitle: clean(body.seoTitle, 160),
      seoDescription: clean(body.seoDescription, 300),
      metaKeywords: clean(body.metaKeywords, 300),
    })
    .where(eq(products.id, productId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const familyIds = await resolveFamilyIds(body.familyIds, body.newFamilyNames);
  await syncJunctions(productId, familyIds, parseIds(body.collectionIds));

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