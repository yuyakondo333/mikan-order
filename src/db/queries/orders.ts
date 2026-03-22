import "server-only";

import { cache } from "react";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { OrderStatus } from "@/types";

export async function getAllOrders() {
  return db.query.orders.findMany({
    with: {
      user: true,
      address: true,
    },
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
  });
}

export async function getOrdersByLineUserId(lineUserId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.lineUserId, lineUserId),
  });
  if (!user) return [];

  return db.select().from(orders).where(eq(orders.userId, user.id));
}

/**
 * スナップショットベースの注文取得（user付き、N+1解消）。
 */
export async function getOrderWithUserAndItemsV2(id: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      user: true,
      items: true,
    },
  });

  if (!order) return null;

  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      productName: item.productName ?? "不明な商品",
      label: item.label ?? "",
      weightKg: item.weightKg ?? "0",
    })),
  };
}

/**
 * スナップショットベースの注文詳細取得（顧客向け、address付き）。
 */
export const getOrderDetailV2 = cache(async function getOrderDetailV2(id: string, userId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.userId, userId)),
    with: {
      address: true,
      items: true,
    },
  });

  if (!order) return null;

  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      productName: item.productName ?? "不明な商品",
      label: item.label ?? "",
      weightKg: item.weightKg ?? "0",
    })),
  };
});

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
) {
  await db
    .update(orders)
    .set({ status })
    .where(eq(orders.id, orderId));
}
