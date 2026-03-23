"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/dal";
import {
  updateOrderStatus,
  getOrderWithUserAndItemsV2,
} from "@/db/queries/orders";
import { getCartWithVariants } from "@/db/queries/cart";
import {
  calcStockConsumptionKg,
  restoreStockKg,
} from "@/db/queries/products";
import {
  sendPickupReadyNotification,
  sendShippingNotification,
  sendOrderConfirmationWithPickup,
  sendOrderConfirmationWithBankTransfer,
} from "@/lib/line";
import { getPaymentSettings } from "@/db/queries/payment-settings";
import { fulfillmentSchema, orderStatusSchema } from "@/lib/validations";
import { formatPickupDate, TIME_SLOT_LABELS } from "@/lib/constants";
import { verifyAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { orders, orderItems, addresses, cartItems, products } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

type OrderActionResult =
  | { success: true; fulfillmentMethod: string }
  | { success: false; error: string };

export async function createOrderByVariant(
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
    const cartItemList = await getCartWithVariants(user.id);

    if (cartItemList.length === 0) {
      return { success: false, error: "カートが空です" };
    }

    // 販売停止チェック（商品 + バリエーション）
    const unavailableItems = cartItemList.filter(
      (item) => !item.productIsAvailable || !item.variantIsAvailable
    );
    if (unavailableItems.length > 0) {
      return { success: false, error: "販売停止中の商品が含まれています" };
    }

    // 在庫チェック（2段構え: 同一商品の合計消費kgで判定）
    const consumptionByProduct = new Map<string, number>();
    const stockByProduct = new Map<string, number>();
    for (const item of cartItemList) {
      const consumption = calcStockConsumptionKg(item.quantity, item.weightKg);
      const current = consumptionByProduct.get(item.productId) ?? 0;
      consumptionByProduct.set(item.productId, current + consumption);
      stockByProduct.set(item.productId, item.stockKg);
    }
    for (const [productId, totalKg] of consumptionByProduct) {
      const stockKg = stockByProduct.get(productId) ?? 0;
      if (totalKg > stockKg) {
        return { success: false, error: "在庫が不足しています" };
      }
    }

    // 合計金額
    const totalJpy = cartItemList.reduce(
      (sum, item) => sum + item.priceJpy * item.quantity,
      0
    );

    // トランザクション
    await db.transaction(async (tx) => {
      // 在庫を原子的に減算（商品ごと）
      for (const [productId, amountKg] of consumptionByProduct) {
        const result = await tx
          .update(products)
          .set({ stockKg: sql`${products.stockKg} - ${amountKg}` })
          .where(
            and(
              eq(products.id, productId),
              gte(products.stockKg, amountKg)
            )
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

      // order_items にスナップショット記録
      await tx.insert(orderItems).values(
        cartItemList.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          label: item.label,
          weightKg: item.weightKg,
          quantity: item.quantity,
          unitPriceJpy: item.priceJpy,
        }))
      );

      // カートクリア
      await tx.delete(cartItems).where(eq(cartItems.userId, user.id));

      return newOrder;
    });

    // LINE通知
    try {
      if (orderData.fulfillmentMethod === "delivery") {
        const ps = await getPaymentSettings();
        await sendOrderConfirmationWithBankTransfer(
          user.lineUserId,
          totalJpy,
          {
            bankName: ps?.bankName ?? null,
            branchName: ps?.branchName ?? null,
            accountType: ps?.accountType ?? null,
            accountNumber: ps?.accountNumber ?? null,
            accountHolder: ps?.accountHolder ?? null,
          }
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
    if (e instanceof Error && e.message.includes("在庫")) {
      return { success: false, error: e.message };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    const details = [
      err?.message,
      err?.code && `code:${err.code}`,
      err?.detail && `detail:${err.detail}`,
      err?.severity && `severity:${err.severity}`,
      err?.constraint && `constraint:${err.constraint}`,
      err?.routine && `routine:${err.routine}`,
    ].filter(Boolean).join(" | ");
    return { success: false, error: `注文エラー: ${details}` };
  }
}

export async function updateOrderStatusByVariantAction(
  orderId: string,
  status: string
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "管理者認証が必要です" };
  }

  const parsed = orderStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { success: false, error: "無効なステータスです" };
  }

  const validatedStatus = parsed.data;

  try {
    // キャンセル時はスナップショットベースで在庫復元
    if (validatedStatus === "cancelled") {
      const order = await getOrderWithUserAndItemsV2(orderId);
      if (order && order.status !== "cancelled") {
        for (const item of order.items) {
          if (!item.productId) continue;
          const amountKg = Number(item.weightKg) * item.quantity;
          await restoreStockKg(item.productId, amountKg);
        }
      }
    }

    const updated = await updateOrderStatus(orderId, validatedStatus);
    if (!updated) {
      return { success: false, error: "注文が見つかりません" };
    }

    // 発送完了 → LINE通知（delivery注文のみ）
    if (validatedStatus === "shipped") {
      try {
        const order = await getOrderWithUserAndItemsV2(orderId);
        if (
          order?.user?.lineUserId &&
          order.fulfillmentMethod === "delivery"
        ) {
          const itemsSummary = order.items
            .map(
              (item) =>
                `${item.productName} ${item.label} × ${item.quantity}`
            )
            .join("、");

          await sendShippingNotification({
            lineUserId: order.user.lineUserId,
            itemsSummary,
          });
        }
      } catch (notifyError) {
        console.error(
          "Failed to send shipping notification:",
          notifyError
        );
      }
    }

    // 準備完了 → LINE通知（バリエーションラベル付き）
    if (validatedStatus === "ready") {
      try {
        const order = await getOrderWithUserAndItemsV2(orderId);
        if (
          order?.user?.lineUserId &&
          order.fulfillmentMethod === "pickup"
        ) {
          const itemsSummary = order.items
            .map(
              (item) =>
                `${item.productName} ${item.label} × ${item.quantity}`
            )
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
        console.error(
          "Failed to send pickup ready notification:",
          notifyError
        );
      }
    }

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (e) {
    console.error("Failed to update order status:", e);
    return { success: false, error: "注文ステータスの更新に失敗しました" };
  }
}
