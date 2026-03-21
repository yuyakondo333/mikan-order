"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/dal";
import {
  deleteAllCartItems,
  getCartItemByVariant,
  upsertCartItemByVariant,
  deleteCartItemByVariant,
} from "@/db/queries/cart";
import { calcStockConsumptionKg } from "@/db/queries/products";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";

type CartActionResult = { success: true } | { success: false; error: string };

function revalidateCartPages() {
  revalidatePath("/", "layout");
  revalidatePath("/cart");
  revalidatePath("/confirm");
  revalidatePath("/products");
}

export async function clearCart(): Promise<CartActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  await deleteAllCartItems(user.id);

  revalidateCartPages();
  return { success: true };
}

export async function addToCartByVariant(
  variantId: string,
  quantity: number
): Promise<CartActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  if (quantity < 1) {
    return { success: false, error: "数量は1以上を指定してください" };
  }

  const variant = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, variantId),
  });
  if (!variant) {
    return { success: false, error: "バリエーションが見つかりません" };
  }
  if (!variant.isAvailable) {
    return {
      success: false,
      error: "このバリエーションは現在販売されていません",
    };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, variant.productId),
  });
  if (!product || !product.isAvailable) {
    return { success: false, error: "この商品は現在販売されていません" };
  }

  const existingItem = await getCartItemByVariant(user.id, variantId);
  const newQty = (existingItem?.quantity ?? 0) + quantity;

  const required = calcStockConsumptionKg(newQty, variant.weightKg);
  if (required > product.stockKg) {
    return { success: false, error: "在庫が不足しています" };
  }

  await upsertCartItemByVariant(user.id, variantId, variant.productId, newQty);

  revalidateCartPages();
  return { success: true };
}

export async function updateCartItemByVariant(
  variantId: string,
  quantity: number
): Promise<CartActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  if (quantity < 1) {
    return { success: false, error: "数量は1以上を指定してください" };
  }

  const variant = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, variantId),
  });
  if (!variant) {
    return { success: false, error: "バリエーションが見つかりません" };
  }
  if (!variant.isAvailable) {
    return {
      success: false,
      error: "このバリエーションは現在販売されていません",
    };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, variant.productId),
  });
  if (!product || !product.isAvailable) {
    return { success: false, error: "この商品は現在販売されていません" };
  }

  const required = calcStockConsumptionKg(quantity, variant.weightKg);
  if (required > product.stockKg) {
    return { success: false, error: "在庫が不足しています" };
  }

  await upsertCartItemByVariant(
    user.id,
    variantId,
    variant.productId,
    quantity
  );

  revalidateCartPages();
  return { success: true };
}

export async function removeCartItemByVariant(
  variantId: string
): Promise<CartActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "認証が必要です" };

  await deleteCartItemByVariant(user.id, variantId);

  revalidateCartPages();
  return { success: true };
}
