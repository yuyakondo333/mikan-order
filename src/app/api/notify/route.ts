import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendShippingNotification } from "@/lib/line";

export async function POST(request: NextRequest) {
  const { orderId } = await request.json();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, order.userId),
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await sendShippingNotification(user.lineUserId, orderId);

  // ステータスを shipped に更新
  await db
    .update(orders)
    .set({ status: "shipped" })
    .where(eq(orders.id, orderId));

  return NextResponse.json({ success: true });
}
