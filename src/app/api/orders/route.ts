import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, addresses } from "@/db/schema";
import { createOrderSchema } from "@/lib/validations";
import { getAllOrders, getOrdersByLineUserId } from "@/db/queries/orders";
import { upsertUser } from "@/db/queries/users";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (userId) {
      const userOrders = await getOrdersByLineUserId(userId);
      return NextResponse.json(userOrders);
    }

    const allOrders = await getAllOrders();
    return NextResponse.json(allOrders);
  } catch (e) {
    console.error("Failed to fetch orders:", e);
    return NextResponse.json(
      { error: "注文の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    lineUserId,
    displayName,
    pictureUrl,
    address,
    paymentMethod,
    items,
  } = parsed.data;

  try {
    const user = await upsertUser({ lineUserId, displayName, pictureUrl });

    // 配送先保存
    const [newAddress] = await db
      .insert(addresses)
      .values({ ...address, userId: user.id })
      .returning();

    // 合計計算
    const totalJpy = items.reduce(
      (sum, item) => sum + item.priceJpy * item.quantity,
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
      items.map((item) => ({
        orderId: order.id,
        productId: item.id,
        quantity: item.quantity,
        unitPriceJpy: item.priceJpy,
      }))
    );

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error("Failed to create order:", e);
    return NextResponse.json(
      { error: "注文の作成に失敗しました" },
      { status: 500 }
    );
  }
}
