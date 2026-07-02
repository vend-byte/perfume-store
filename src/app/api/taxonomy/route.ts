import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, brands, fragranceFamilies, collections } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Public: all four taxonomies in one call (enabled flag included; clients filter)
export async function GET() {
  const [cats, brs, fams, cols] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
    db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.id)),
    db.select().from(fragranceFamilies).orderBy(asc(fragranceFamilies.sortOrder), asc(fragranceFamilies.id)),
    db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.id)),
  ]);
  return NextResponse.json({ categories: cats, brands: brs, families: fams, collections: cols });
}
