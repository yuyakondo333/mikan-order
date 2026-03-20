import "server-only";

import { db } from "@/db";
import { cartItems, products, productVariants } from "@/db/schema";
import { eq, and, gt, sum } from "drizzle-orm";
import type { CartItemWithVariant } from "@/types";

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

function getCartExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - CART_EXPIRY_DAYS);
  return date;
}

export async function getCartWithProducts(userId: string) {
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
      and(
        eq(cartItems.userId, userId),
        gt(cartItems.updatedAt, getCartExpiryDate())
      )
    );
}

// --- Variant-aware functions (新スキーマ対応) ---

export async function getCartItemByVariant(
  userId: string,
  variantId: string
) {
  return db.query.cartItems.findFirst({
    where: and(
      eq(cartItems.userId, userId),
      eq(cartItems.variantId, variantId)
    ),
  });
}

export async function upsertCartItemByVariant(
  userId: string,
  variantId: string,
  productId: string,
  quantity: number
) {
  await db
    .insert(cartItems)
    .values({
      userId,
      variantId,
      productId,
      quantity,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { variantId, quantity, updatedAt: new Date() },
    });
}

export async function deleteCartItemByVariant(
  userId: string,
  variantId: string
) {
  await db
    .delete(cartItems)
    .where(
      and(eq(cartItems.userId, userId), eq(cartItems.variantId, variantId))
    );
}

export async function getCartWithVariants(
  userId: string
): Promise<CartItemWithVariant[]> {
  return db
    .select({
      id: cartItems.id,
      variantId: cartItems.variantId,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      productName: products.name,
      productImageUrl: products.imageUrl,
      productIsAvailable: products.isAvailable,
      stockKg: products.stockKg,
      label: productVariants.label,
      weightKg: productVariants.weightKg,
      priceJpy: productVariants.priceJpy,
      variantIsAvailable: productVariants.isAvailable,
      isGiftOnly: productVariants.isGiftOnly,
      updatedAt: cartItems.updatedAt,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(
      and(
        eq(cartItems.userId, userId),
        gt(cartItems.updatedAt, getCartExpiryDate())
      )
    ) as unknown as Promise<CartItemWithVariant[]>;
}

export async function getCartItemCount(userId: string): Promise<number> {
  const result = await db
    .select({ total: sum(cartItems.quantity) })
    .from(cartItems)
    .where(
      and(
        eq(cartItems.userId, userId),
        gt(cartItems.updatedAt, getCartExpiryDate())
      )
    );

  return Number(result[0]?.total ?? 0);
}
