"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/dal";
import { updateOrderStatus, getOrderWithUserAndItems } from "@/db/queries/orders";
import { getCartWithProducts } from "@/db/queries/cart";
import { restoreStock, calcStockConsumption } from "@/db/queries/products";
import {
  sendPickupReadyNotification,
  sendOrderConfirmationWithPickup,
  sendOrderConfirmationWithBankTransfer,
} from "@/lib/line";
import { fulfillmentSchema } from "@/lib/validations";
import { formatPickupDate, TIME_SLOT_LABELS } from "@/lib/constants";
import { verifyAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { orders, orderItems, addresses, cartItems, products } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

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
    const cartItemList = await getCartWithProducts(user.id);

    if (cartItemList.length === 0) {
      return { success: false, error: "カートが空です" };
    }

    // 販売停止商品チェック
    const unavailableItems = cartItemList.filter((item) => !item.isAvailable);
    if (unavailableItems.length > 0) {
      return { success: false, error: "販売停止中の商品が含まれています" };
    }

    // 在庫チェック（事前チェック。トランザクション内で再度確認）
    for (const item of cartItemList) {
      const required = calcStockConsumption(
        item.quantity,
        item.weightGrams,
        item.stockUnit
      );
      if (item.stock < required) {
        return { success: false, error: "在庫が不足しています" };
      }
    }

    // 合計金額はDBの商品価格から計算
    const totalJpy = cartItemList.reduce(
      (sum, item) => sum + item.priceJpy * item.quantity,
      0
    );

    // 在庫減算〜注文作成〜カートクリアをトランザクションで実行
    const order = await db.transaction(async (tx) => {
      // 在庫を原子的に減算
      for (const item of cartItemList) {
        const required = calcStockConsumption(
          item.quantity,
          item.weightGrams,
          item.stockUnit
        );
        const result = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${required}` })
          .where(
            and(eq(products.id, item.productId), gte(products.stock, required))
          )
          .returning();
        if (result.length === 0) {
          throw new Error("在庫が不足しています。再度お試しください。");
        }
      }

      let addressId: string | null = null;
      let initialStatus: "pending" | "awaiting_payment" = "pending";

      if (orderData.fulfillmentMethod === "delivery") {
        const [newAddress] = await tx
          .insert(addresses)
          .values({ ...orderData.address, userId: user.id })
          .returning();
        addressId = newAddress.id;
        initialStatus = "awaiting_payment";
      }

      const [newOrder] = await tx
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

      await tx.insert(orderItems).values(
        cartItemList.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPriceJpy: item.priceJpy,
        }))
      );

      // カートをクリア
      await tx
        .delete(cartItems)
        .where(eq(cartItems.userId, user.id));

      return newOrder;
    });

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
    // トランザクション内で投げたエラーメッセージをそのまま返す
    if (e instanceof Error && e.message.includes("在庫")) {
      return { success: false, error: e.message };
    }
    return { success: false, error: "注文の作成に失敗しました" };
  }
}

export async function updateOrderStatusAction(
  orderId: string,
  status: string
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "管理者認証が必要です" };
  }

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
