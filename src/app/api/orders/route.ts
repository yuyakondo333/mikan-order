import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, addresses, products } from "@/db/schema";
import { createOrderSchema } from "@/lib/validations";
import { getAllOrders, getOrdersByLineUserId } from "@/db/queries/orders";
import { upsertUser } from "@/db/queries/users";
import { deductStock, calcStockConsumption } from "@/db/queries/products";
import {
  sendOrderConfirmationWithBankTransfer,
  sendOrderConfirmationWithPickup,
} from "@/lib/line";
import { formatPickupDate, TIME_SLOT_LABELS } from "@/lib/constants";
import { auth } from "@/auth";
import { inArray } from "drizzle-orm";

export async function GET() {
  try {
    // 管理画面用: 全注文一覧（管理画面はadmin_session cookieで保護済み）
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
  // サーバーサイドでセッションからユーザー情報を取得
  const session = await auth();
  if (!session?.user?.lineUserId) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    );
  }

  const { lineUserId, displayName, pictureUrl } = session.user;

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { order: orderData, items } = parsed.data;

  try {
    // 在庫チェック: 商品情報を取得して在庫を確認
    const productIds = items.map((item) => item.id);
    const dbProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const outOfStockItems: string[] = [];

    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) {
        outOfStockItems.push(item.id);
        continue;
      }
      const required = calcStockConsumption(
        item.quantity,
        product.weightGrams,
        product.stockUnit
      );
      if (product.stock < required) {
        outOfStockItems.push(product.name);
      }
    }

    if (outOfStockItems.length > 0) {
      return NextResponse.json(
        {
          error: "在庫が不足しています",
          outOfStockItems,
        },
        { status: 409 }
      );
    }

    // 在庫を原子的に減算
    for (const item of items) {
      const product = productMap.get(item.id)!;
      const required = calcStockConsumption(
        item.quantity,
        product.weightGrams,
        product.stockUnit
      );
      const result = await deductStock(item.id, required);
      if (result.length === 0) {
        return NextResponse.json(
          { error: "在庫が不足しています。再度お試しください。" },
          { status: 409 }
        );
      }
    }

    const user = await upsertUser({ lineUserId, displayName, pictureUrl });

    const totalJpy = items.reduce(
      (sum, item) => sum + item.priceJpy * item.quantity,
      0
    );

    let addressId: string | null = null;
    let initialStatus: "pending" | "awaiting_payment" = "pending";

    if (orderData.fulfillmentMethod === "delivery") {
      const [newAddress] = await db
        .insert(addresses)
        .values({ ...orderData.address, userId: user.id })
        .returning();
      addressId = newAddress.id;
      initialStatus = "awaiting_payment";
    }

    const [order] = await db
      .insert(orders)
      .values({
        userId: user.id,
        fulfillmentMethod: orderData.fulfillmentMethod,
        pickupDate:
          orderData.fulfillmentMethod === "pickup"
            ? orderData.pickupDate
            : null,
        pickupTimeSlot:
          orderData.fulfillmentMethod === "pickup"
            ? orderData.pickupTimeSlot
            : null,
        addressId,
        status: initialStatus,
        totalJpy,
      })
      .returning();

    await db.insert(orderItems).values(
      items.map((item) => ({
        orderId: order.id,
        productId: item.id,
        quantity: item.quantity,
        unitPriceJpy: item.priceJpy,
      }))
    );

    try {
      if (orderData.fulfillmentMethod === "delivery") {
        await sendOrderConfirmationWithBankTransfer(lineUserId, totalJpy);
      } else if (orderData.fulfillmentMethod === "pickup") {
        const pickupDate = formatPickupDate(orderData.pickupDate);
        const pickupTimeSlot =
          TIME_SLOT_LABELS[orderData.pickupTimeSlot] ??
          orderData.pickupTimeSlot;
        await sendOrderConfirmationWithPickup({
          lineUserId,
          pickupDate,
          pickupTimeSlot,
        });
      }
    } catch (err) {
      console.error("Failed to send LINE notification:", err);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error("Failed to create order:", e);
    return NextResponse.json(
      { error: "注文の作成に失敗しました" },
      { status: 500 }
    );
  }
}
