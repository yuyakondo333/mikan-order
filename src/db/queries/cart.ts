import "server-only";

import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { eq, and, gt, sum, sql } from "drizzle-orm";

export async function getCartItem(userId: string, productId: string) {
  return db.query.cartItems.findFirst({
    where: and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)),
  });
}

export async function upsertCartItem(
  userId: string,
  productId: string,
  quantity: number
) {
  await db
    .insert(cartItems)
    .values({ userId, productId, quantity, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { quantity, updatedAt: new Date() },
    });
}

export async function deleteCartItem(userId: string, productId: string) {
  await db
    .delete(cartItems)
    .where(
      and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))
    );
}

export async function deleteAllCartItems(userId: string) {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

const CART_EXPIRY_DAYS = 7;

export async function getCartWithProducts(userId: string) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - CART_EXPIRY_DAYS);

  return db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      name: products.name,
      priceJpy: products.priceJpy,
      weightGrams: products.weightGrams,
      stockUnit: products.stockUnit,
      stock: products.stock,
      isAvailable: products.isAvailable,
      updatedAt: cartItems.updatedAt,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(
      and(eq(cartItems.userId, userId), gt(cartItems.updatedAt, expiryDate))
    );
}

export async function getCartItemCount(userId: string): Promise<number> {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - CART_EXPIRY_DAYS);

  const result = await db
    .select({ total: sum(cartItems.quantity) })
    .from(cartItems)
    .where(
      and(eq(cartItems.userId, userId), gt(cartItems.updatedAt, expiryDate))
    );

  return Number(result[0]?.total ?? 0);
}

export async function deleteExpiredCartItems(userId: string) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - CART_EXPIRY_DAYS);

  await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.userId, userId),
        sql`${cartItems.updatedAt} <= ${expiryDate}`
      )
    );
}
