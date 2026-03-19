"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { upsertUser } from "@/db/queries/users";
import {
  getCartItem,
  upsertCartItem,
  deleteCartItem,
  deleteAllCartItems,
} from "@/db/queries/cart";
import { calcStockConsumption } from "@/db/queries/products";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

type CartActionResult = { success: true } | { success: false; error: string };

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.lineUserId) return null;

  const user = await upsertUser({
    lineUserId: session.user.lineUserId,
    displayName: session.user.displayName ?? "",
    pictureUrl: session.user.pictureUrl,
  });
  return user;
}

export async function addToCart(
  productId: string,
  quantity: number
): Promise<CartActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  if (quantity < 1) {
    return { success: false, error: "数量は1以上を指定してください" };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) {
    return { success: false, error: "商品が見つかりません" };
  }

  if (!product.isAvailable) {
    return { success: false, error: "この商品は現在販売されていません" };
  }

  const existingItem = await getCartItem(user.id, productId);
  const newQty = (existingItem?.quantity ?? 0) + quantity;

  const required = calcStockConsumption(
    newQty,
    product.weightGrams,
    product.stockUnit
  );
  if (required > product.stock) {
    return { success: false, error: "在庫が不足しています" };
  }

  await upsertCartItem(user.id, productId, newQty);

  revalidatePath("/");
  return { success: true };
}

export async function updateCartItemQuantity(
  productId: string,
  quantity: number
): Promise<CartActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  if (quantity < 1) {
    return { success: false, error: "数量は1以上を指定してください" };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) {
    return { success: false, error: "商品が見つかりません" };
  }

  const required = calcStockConsumption(
    quantity,
    product.weightGrams,
    product.stockUnit
  );
  if (required > product.stock) {
    return { success: false, error: "在庫が不足しています" };
  }

  await upsertCartItem(user.id, productId, quantity);

  revalidatePath("/");
  return { success: true };
}

export async function removeFromCart(
  productId: string
): Promise<CartActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  await deleteCartItem(user.id, productId);

  revalidatePath("/");
  return { success: true };
}

export async function clearCart(): Promise<CartActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  await deleteAllCartItems(user.id);

  revalidatePath("/");
  return { success: true };
}
