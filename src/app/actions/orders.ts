"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/dal";
import { updateOrderStatus, getOrderWithUserAndItems } from "@/db/queries/orders";
import { getCartWithProducts, deleteAllCartItems } from "@/db/queries/cart";
import {
  restoreStock,
  calcStockConsumption,
  deductStock,
} from "@/db/queries/products";
import {
  sendPickupReadyNotification,
  sendOrderConfirmationWithPickup,
  sendOrderConfirmationWithBankTransfer,
} from "@/lib/line";
import { fulfillmentSchema } from "@/lib/validations";
import { formatPickupDate, TIME_SLOT_LABELS } from "@/lib/constants";
import { db } from "@/db";
import { orders, orderItems, addresses, products } from "@/db/schema";
import { eq } from "drizzle-orm";

type OrderActionResult =
  | { success: true; fulfillmentMethod: string }
  | { success: false; error: string };

export async function createOrder(
  fulfillmentData: unknown
): Promise<OrderActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  const parsed = fulfillmentSchema.safeParse(fulfillmentData);
  if (!parsed.success) {
    return { success: false, error: "入力内容に誤りがあります" };
  }

  const orderData = parsed.data;

  try {
    const cartItems = await getCartWithProducts(user.id);

    if (cartItems.length === 0) {
      return { success: false, error: "カートが空です" };
    }

    // 販売停止商品チェック
    const unavailableItems = cartItems.filter((item) => !item.isAvailable);
    if (unavailableItems.length > 0) {
      return { success: false, error: "販売停止中の商品が含まれています" };
    }

    // 在庫チェック
    for (const item of cartItems) {
      const required = calcStockConsumption(
        item.quantity,
        item.weightGrams,
        item.stockUnit
      );
      if (item.stock < required) {
        return { success: false, error: "在庫が不足しています" };
      }
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
        return {
          success: false,
          error: "在庫が不足しています。再度お試しください。",
        };
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

    // LINE通知（失敗しても注文は成功扱い）
    try {
      if (orderData.fulfillmentMethod === "delivery") {
        await sendOrderConfirmationWithBankTransfer(
          user.lineUserId,
          totalJpy
        );
      } else if (orderData.fulfillmentMethod === "pickup") {
        const pickupDate = formatPickupDate(orderData.pickupDate);
        const pickupTimeSlot =
          TIME_SLOT_LABELS[orderData.pickupTimeSlot] ??
          orderData.pickupTimeSlot;
        await sendOrderConfirmationWithPickup({
          lineUserId: user.lineUserId,
          pickupDate,
          pickupTimeSlot,
        });
      }
    } catch (err) {
      console.error("Failed to send LINE notification:", err);
    }

    revalidatePath("/", "layout");
    revalidatePath("/cart");
    revalidatePath("/confirm");
    revalidatePath("/products");

    return { success: true, fulfillmentMethod: orderData.fulfillmentMethod };
  } catch (e) {
    console.error("Failed to create order:", e);
    return { success: false, error: "注文の作成に失敗しました" };
  }
}

export async function updateOrderStatusAction(
  orderId: string,
  status: string
) {
  try {
    // キャンセル時は在庫を復元
    if (status === "cancelled") {
      const order = await getOrderWithUserAndItems(orderId);
      if (order && order.status !== "cancelled") {
        for (const item of order.items) {
          const product = await db.query.products.findFirst({
            where: eq(products.id, item.productId),
          });
          if (product) {
            const amount = calcStockConsumption(
              item.quantity,
              product.weightGrams,
              product.stockUnit
            );
            await restoreStock(item.productId, amount);
          }
        }
      }
    }

    await updateOrderStatus(orderId, status);

    // 取り置き注文を「準備完了」にした場合、LINE通知を送信
    if (status === "ready") {
      try {
        const order = await getOrderWithUserAndItems(orderId);
        if (order?.user?.lineUserId && order.fulfillmentMethod === "pickup") {
          const itemsSummary = order.items
            .map((item) => `${item.productName} × ${item.quantity}`)
            .join("、");
          const pickupDate = order.pickupDate
            ? formatPickupDate(order.pickupDate)
            : "未指定";
          const pickupTimeSlot = order.pickupTimeSlot
            ? TIME_SLOT_LABELS[order.pickupTimeSlot] ?? order.pickupTimeSlot
            : "未指定";

          await sendPickupReadyNotification({
            lineUserId: order.user.lineUserId,
            itemsSummary,
            pickupDate,
            pickupTimeSlot,
          });
        }
      } catch (notifyError) {
        console.error("Failed to send pickup ready notification:", notifyError);
        // 通知失敗してもステータス更新自体は成功扱い
      }
    }

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (e) {
    console.error("Failed to update order status:", e);
    return { success: false, error: "注文ステータスの更新に失敗しました" };
  }
}
