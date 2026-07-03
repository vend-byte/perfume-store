import type { ProductSize } from "@/db/schema";

export function clean(v: unknown, max: number): string {
  return String(v ?? "").replace(/<[^>]*>/g, "").trim().slice(0, max);
}

export function parseIds(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 50);
}

export function parseImages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((u) => String(u ?? "").slice(0, 100000))
    .filter((u) => u.startsWith("/") || u.startsWith("http"))
    .slice(0, 20);
}

/** Replace a product's fragrance-family and collection junction rows. */
export async function syncJunctions(
  productId: number,
  familyIds: number[],
  collectionIds: number[]
) {
  const { db } = await import("@/db");
  const { productFamilies, productCollections } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.delete(productFamilies).where(eq(productFamilies.productId, productId));
  await db.delete(productCollections).where(eq(productCollections.productId, productId));
  if (familyIds.length) {
    await db.insert(productFamilies).values(familyIds.map((familyId) => ({ productId, familyId })));
  }
  if (collectionIds.length) {
    await db.insert(productCollections).values(collectionIds.map((collectionId) => ({ productId, collectionId })));
  }
}

export function parseSizes(input: unknown): ProductSize[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s) => ({
      label: clean(s?.label, 20),
      price: Math.max(0, Math.round(Number(s?.price) || 0)),
      discountPrice: s?.discountPrice
        ? Math.max(0, Math.round(Number(s.discountPrice)))
        : null,
      stock: Math.max(0, Math.round(Number(s?.stock) || 0)),
      weight: s?.weight ? clean(s.weight, 30) : undefined,
    }))
    .filter((s) => s.label.length > 0 && s.price > 0)
    .slice(0, 30);
}

/** Find an existing taxonomy row by case-insensitive name, or create it. */
async function findOrCreateTaxon(
  tableName: "brands" | "categories" | "fragranceFamilies",
  name: string
): Promise<number> {
  const trimmed = name.trim();
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { sql } = await import("drizzle-orm");
  const table = schema[tableName];

  const [existing] = await db
    .select()
    .from(table)
    .where(sql`lower(${table.name}) = lower(${trimmed})`)
    .limit(1);
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(table)
    .values({ name: trimmed, enabled: true, sortOrder: 0 } as never)
    .returning();
  return inserted.id;
}

/** Resolve a brand from an id (existing) or a name (auto-creates if new). */
export async function resolveBrand(
  idInput: unknown,
  nameInput: unknown
): Promise<{ id: number | null; name: string }> {
  const name = clean(nameInput, 80);
  const id = Number(idInput);
  if (Number.isInteger(id) && id > 0) return { id, name };
  if (!name) return { id: null, name: "" };
  return { id: await findOrCreateTaxon("brands", name), name };
}

/** Resolve a category from an id (existing) or a name (auto-creates if new). */
export async function resolveCategory(
  idInput: unknown,
  nameInput: unknown
): Promise<{ id: number | null; name: string }> {
  const name = clean(nameInput, 60);
  const id = Number(idInput);
  if (Number.isInteger(id) && id > 0) return { id, name };
  if (!name) return { id: null, name: "" };
  return { id: await findOrCreateTaxon("categories", name), name };
}

/** Merge explicit family ids with new family names (auto-creates any new ones). */
export async function resolveFamilyIds(
  idsInput: unknown,
  newNamesInput: unknown
): Promise<number[]> {
  const ids = new Set(parseIds(idsInput));
  if (Array.isArray(newNamesInput)) {
    for (const raw of newNamesInput) {
      const name = clean(raw, 60);
      if (!name) continue;
      ids.add(await findOrCreateTaxon("fragranceFamilies", name));
    }
  }
  return [...ids].slice(0, 50);
}

/** Generate a URL-safe, unique slug from a product name. */
export async function generateUniqueSlug(name: string, excludeId?: number): Promise<string> {
  const { db } = await import("@/db");
  const { products } = await import("@/db/schema");
  const { eq, and, ne } = await import("drizzle-orm");

  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 140) || "product";

  let slug = base;
  let attempt = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = excludeId
      ? await db.select().from(products).where(and(eq(products.slug, slug), ne(products.id, excludeId))).limit(1)
      : await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (rows.length === 0) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
}

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Packed",
  "Ready for Dispatch",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Refunded",
] as const;

export const PRODUCT_STATUSES = [
  "In Stock",
  "Out of Stock",
  "Coming Soon",
  "Best Seller",
  "Featured",
  "Flash Sale",
  "Limited Edition",
  "New Arrival",
] as const;