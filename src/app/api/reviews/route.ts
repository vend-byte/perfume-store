import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, orders } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import { clean } from "@/lib/product-utils";

export const dynamic = "force-dynamic";

// Public: approved reviews for a product. Admin (?all=1): every review.
export async function GET(request: NextRequest) {
  const isAdmin = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const all = request.nextUrl.searchParams.get("all") === "1" && isAdmin;
  const productId = Number(request.nextUrl.searchParams.get("productId"));

  if (all) {
    const rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    return NextResponse.json({ reviews: rows });
  }

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.approved, true)))
    .orderBy(desc(reviews.pinned), desc(reviews.createdAt));

  return NextResponse.json({ reviews: rows });
}

// Public: submit review — ONLY verified purchasers (order code + phone must
// match an order that contains this product).
export async function POST(request: NextRequest) {
  let body: {
    productId?: number; orderCode?: string; phone?: string;
    name?: string; rating?: number; message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const productId = Number(body.productId);
  const orderCode = clean(body.orderCode, 30).toUpperCase();
  const phone = clean(body.phone, 30);
  const name = clean(body.name, 100);
  const message = clean(body.message, 1000);
  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));

  if (!Number.isInteger(productId) || productId <= 0)
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  if (name.length < 2)
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (message.length < 5)
    return NextResponse.json({ error: "Please write your review." }, { status: 400 });

  // Verify the purchase
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.code, orderCode), eq(orders.phone, phone)));

  if (!order) {
    return NextResponse.json(
      { error: "Purchase not verified. Enter the order code and phone number from your purchase." },
      { status: 403 }
    );
  }
  if (!order.items.some((i) => i.productId === productId)) {
    return NextResponse.json(
      { error: "This order does not contain this product." },
      { status: 403 }
    );
  }

  // One review per product per order
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.orderCode, orderCode), eq(reviews.productId, productId)));
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "You have already reviewed this product for this order." },
      { status: 409 }
    );
  }

  const [inserted] = await db
    .insert(reviews)
    .values({ productId, orderCode, name, rating, message, approved: false })
    .returning();

  return NextResponse.json(
    { review: inserted, message: "Thank you! Your verified review is awaiting approval." },
    { status: 201 }
  );
}
