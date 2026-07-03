import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productFamilies, productCollections } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
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

// Public: all products with their family/collection ids
export async function GET() {
  const [rows, pf, pc] = await Promise.all([
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(productFamilies),
    db.select().from(productCollections),
  ]);
  const withRelations = rows.map((p) => ({
    ...p,
    familyIds: pf.filter((x) => x.productId === p.id).map((x) => x.familyId),
    collectionIds: pc.filter((x) => x.productId === p.id).map((x) => x.collectionId),
  }));
  return NextResponse.json({ products: withRelations });
}

// Admin: create product
export async function POST(request: NextRequest) {
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

  const name = clean(body.name, 140);
  const sizes = parseSizes(body.sizes);
  const isDraft = body.draft === true;

  if (name.length < 2) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }
  // Drafts can be saved incomplete; published products need at least one priced size.
  if (!isDraft && sizes.length === 0) {
    return NextResponse.json(
      { error: "At least one size with a price is required." },
      { status: 400 }
    );
  }

  const images = parseImages(body.images);
  const brand = await resolveBrand(body.brandId, body.brand);
  const category = await resolveCategory(body.categoryId, body.category);
  const slug = await generateUniqueSlug(name);

  const [inserted] = await db
    .insert(products)
    .values({
      name,
      slug,
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
    .returning();

  const code = `TSA-${String(inserted.id).padStart(6, "0")}`;
  const [updated] = await db
    .update(products)
    .set({ code })
    .where(eq(products.id, inserted.id))
    .returning();

  const familyIds = await resolveFamilyIds(body.familyIds, body.newFamilyNames);
  await syncJunctions(inserted.id, familyIds, parseIds(body.collectionIds));

  return NextResponse.json({ product: updated }, { status: 201 });
}