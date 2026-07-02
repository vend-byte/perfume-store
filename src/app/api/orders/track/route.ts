import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Public: track an order by code + phone (both must match)
export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  const phone = (request.nextUrl.searchParams.get("phone") ?? "").trim();

  if (code.length < 5 || phone.length < 9) {
    return NextResponse.json(
      { error: "Provide your order code and the phone number used at checkout." },
      { status: 400 }
    );
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.code, code), eq(orders.phone, phone)));

  if (!order) {
    return NextResponse.json(
      { error: "No order found. Check your order code and phone number." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    order: {
      code: order.code,
      status: order.status,
      total: order.total,
      items: order.items,
      createdAt: order.createdAt,
      city: order.city,
    },
  });
}
