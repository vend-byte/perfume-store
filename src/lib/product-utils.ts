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
    }))
    .filter((s) => s.label.length > 0 && s.price > 0)
    .slice(0, 30);
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
