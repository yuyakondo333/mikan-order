import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, addresses } from "@/db/schema";
import { fulfillmentSchema } from "@/lib/validations";
import { getAllOrders } from "@/db/queries/orders";
import { upsertUser } from "@/db/queries/users";
import { getCartWithProducts, deleteAllCartItems } from "@/db/queries/cart";
import { deductStock, calcStockConsumption } from "@/db/queries/products";
import {
  sendOrderConfirmationWithBankTransfer,
  sendOrderConfirmationWithPickup,
} from "@/lib/line";
import { formatPickupDate, TIME_SLOT_LABELS } from "@/lib/constants";
import { auth } from "@/auth";

export async function GET() {
  try {
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
  const session = await auth();
  if (!session?.user?.lineUserId) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    );
  }

  const { lineUserId, displayName, pictureUrl } = session.user;

  const body = await request.json();
  const parsed = fulfillmentSchema.safeParse(body.order);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const orderData = parsed.data;

  try {
    const user = await upsertUser({ lineUserId, displayName, pictureUrl });

    // カートをDBから取得（クライアント送信のitemsは使わない）
    const cartItems = await getCartWithProducts(user.id);

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: "カートが空です" },
        { status: 400 }
      );
    }

    // 販売停止商品チェック
    const unavailableItems = cartItems.filter((item) => !item.isAvailable);
    if (unavailableItems.length > 0) {
      return NextResponse.json(
        {
          error: "販売停止中の商品が含まれています",
          unavailableItems: unavailableItems.map((item) => item.name),
        },
        { status: 409 }
      );
    }

    // 在庫チェック
    const outOfStockItems: string[] = [];
    for (const item of cartItems) {
      const required = calcStockConsumption(
        item.quantity,
        item.weightGrams,
        item.stockUnit
      );
      if (item.stock < required) {
        outOfStockItems.push(item.name);
      }
    }

    if (outOfStockItems.length > 0) {
      return NextResponse.json(
        { error: "在庫が不足しています", outOfStockItems },
        { status: 409 }
      );
    }

    // 在庫を原子的に減算
    for (const item of cartItems) {
      const required = calcStockConsumption(
        item.quantity,
        item.weightGrams,
        item.stockUnit
      );
      const result = await deductStock(item.productId, required);
      if (result.length === 0) {
        return NextResponse.json(
          { error: "在庫が不足しています。再度お試しください。" },
          { status: 409 }
        );
      }
    }

    // 合計金額はDBの商品価格から計算
    const totalJpy = cartItems.reduce(
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

    // order_itemsにはDBの最新価格を記録
    await db.insert(orderItems).values(
      cartItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceJpy: item.priceJpy,
      }))
    );

    // カートをクリア
    await deleteAllCartItems(user.id);

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
