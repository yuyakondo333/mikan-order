import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, users, addresses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (userId) {
    // LINE userId でフィルタ
    const user = await db.query.users.findFirst({
      where: eq(users.lineUserId, userId),
    });
    if (!user) return NextResponse.json([]);

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, user.id));
    return NextResponse.json(userOrders);
  }

  // 管理画面: 全注文を返す
  const allOrders = await db.select().from(orders);
  return NextResponse.json(allOrders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    lineUserId,
    displayName,
    pictureUrl,
    address,
    paymentMethod,
    items,
  } = body;

  // ユーザー upsert
  let user = await db.query.users.findFirst({
    where: eq(users.lineUserId, lineUserId),
  });
  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({ lineUserId, displayName, pictureUrl })
      .returning();
    user = newUser;
  }

  // 配送先保存
  const [newAddress] = await db
    .insert(addresses)
    .values({ ...address, userId: user.id })
    .returning();

  // 合計計算
  const totalJpy = items.reduce(
    (sum: number, item: { priceJpy: number; quantity: number }) =>
      sum + item.priceJpy * item.quantity,
    0
  );

  // 注文作成
  const [order] = await db
    .insert(orders)
    .values({
      userId: user.id,
      addressId: newAddress.id,
      paymentMethod,
      totalJpy,
    })
    .returning();

  // 注文明細作成
  await db.insert(orderItems).values(
    items.map((item: { id: string; priceJpy: number; quantity: number }) => ({
      orderId: order.id,
      productId: item.id,
      quantity: item.quantity,
      unitPriceJpy: item.priceJpy,
    }))
  );

  return NextResponse.json(order, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { orderId, status } = await request.json();
  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
  return NextResponse.json({ success: true });
}
