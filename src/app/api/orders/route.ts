import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, products, type OrderItem } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import { clean } from "@/lib/product-utils";

export const dynamic = "force-dynamic";

// Admin: list all orders
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return NextResponse.json({ orders: rows });
}

// Public: place an order. Validates items against DB prices and deducts stock.
export async function POST(request: NextRequest) {
  let body: {
    name?: string; phone?: string; email?: string; address?: string;
    city?: string; payment?: string;
    items?: { productId?: number; size?: string; quantity?: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  if (name.length < 2) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  if (!/^\+?[0-9\s-]{9,15}$/.test(phone)) {
    return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
  }
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  // Validate every item against the database (never trust client prices)
  const orderItems: OrderItem[] = [];
  let total = 0;

  for (const raw of rawItems) {
    const productId = Number(raw.productId);
    const sizeLabel = clean(raw.size, 20);
    const quantity = Math.min(20, Math.max(1, Math.round(Number(raw.quantity) || 1)));

    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) {
      return NextResponse.json({ error: `A product in your cart no longer exists.` }, { status: 400 });
    }
    const size = product.sizes.find((s) => s.label === sizeLabel);
    if (!size) {
      return NextResponse.json({ error: `Size ${sizeLabel} is unavailable for ${product.name}.` }, { status: 400 });
    }
    if (size.stock < quantity) {
      return NextResponse.json(
        { error: `Only ${size.stock} left of ${product.name} (${sizeLabel}).` },
        { status: 400 }
      );
    }
    const price = size.discountPrice || size.price;
    total += price * quantity;
    orderItems.push({ productId, name: product.name, size: sizeLabel, quantity, price });
  }

  // Deduct stock; auto set Out of Stock when everything hits zero (unless Coming Soon)
  for (const item of orderItems) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId));
    if (!product) continue;
    const newSizes = product.sizes.map((s) =>
      s.label === item.size ? { ...s, stock: Math.max(0, s.stock - item.quantity) } : s
    );
    const allOut = newSizes.every((s) => s.stock === 0);
    const newStatus =
      allOut && product.status !== "Coming Soon" ? "Out of Stock" : product.status;
    await db
      .update(products)
      .set({ sizes: newSizes, status: newStatus })
      .where(eq(products.id, item.productId));
  }

  const code = `ORD-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;

  const [order] = await db
    .insert(orders)
    .values({
      code,
      name,
      phone,
      email: clean(body.email, 120),
      address: clean(body.address, 500),
      city: clean(body.city, 60) || "Nairobi",
      payment: clean(body.payment, 30) || "M-Pesa",
      items: orderItems,
      total,
    })
    .returning();

  return NextResponse.json({ order }, { status: 201 });
}
