import "server-only";

import { db } from "@/db";
import { orders, users, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAllOrders() {
  return db.select().from(orders);
}

export async function getOrdersByLineUserId(lineUserId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.lineUserId, lineUserId),
  });
  if (!user) return [];

  return db.select().from(orders).where(eq(orders.userId, user.id));
}

export async function getOrderDetail(id: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      address: true,
      items: true,
    },
  });

  if (!order) return null;

  const itemsWithProduct = await Promise.all(
    order.items.map(async (item) => {
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      return {
        ...item,
        productName: product?.name ?? "不明な商品",
        productVariety: product?.variety ?? "",
      };
    })
  );

  return {
    ...order,
    items: itemsWithProduct,
  };
}

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus | string
) {
  await db
    .update(orders)
    .set({ status: status as OrderStatus })
    .where(eq(orders.id, orderId));
}
