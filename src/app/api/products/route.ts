import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productFamilies, productCollections } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import { clean, parseSizes, parseIds, parseImages, syncJunctions } from "@/lib/product-utils";

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
  if (name.length < 2) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }
  if (sizes.length === 0) {
    return NextResponse.json(
      { error: "At least one size with a price is required." },
      { status: 400 }
    );
  }

  const images = parseImages(body.images);

  const [inserted] = await db
    .insert(products)
    .values({
      name,
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
    .returning();

  const code = `TSA-${String(inserted.id).padStart(6, "0")}`;
  const [updated] = await db
    .update(products)
    .set({ code })
    .where(eq(products.id, inserted.id))
    .returning();

  await syncJunctions(inserted.id, parseIds(body.familyIds), parseIds(body.collectionIds));

  return NextResponse.json({ product: updated }, { status: 201 });
}
