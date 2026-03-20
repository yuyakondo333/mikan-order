import "server-only";

import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { eq, sql, and, gte, asc } from "drizzle-orm";
import type { ProductWithVariants } from "@/types";

export async function getAvailableProducts() {
  return db
    .select()
    .from(products)
    .where(eq(products.isAvailable, true));
}

export async function getAllProducts() {
  return db.select().from(products);
}

/**
 * 販売中商品をバリエーション付きで取得。
 * - products.isAvailable = true
 * - variants.isAvailable = true のみ（displayOrder順）
 * - 全variantが非公開の商品は除外
 */
export async function getAvailableProductsWithVariants(): Promise<
  ProductWithVariants[]
> {
  const result = await db.query.products.findMany({
    where: eq(products.isAvailable, true),
    with: {
      variants: {
        where: eq(productVariants.isAvailable, true),
        orderBy: [asc(productVariants.displayOrder)],
      },
    },
  });
  // 全variantが非公開（= フィルタ後0件）の商品を除外
  return result.filter((p) => p.variants.length > 0) as ProductWithVariants[];
}

/**
 * 全商品をバリエーション付きで取得（管理画面用）。
 */
export async function getAllProductsWithVariants(): Promise<
  ProductWithVariants[]
> {
  const result = await db.query.products.findMany({
    with: {
      variants: {
        orderBy: [asc(productVariants.displayOrder)],
      },
    },
  });
  return result as ProductWithVariants[];
}

export async function createProduct(data: {
  name: string;
  variety: string;
  weightGrams: number;
  priceJpy: number;
  description?: string | null;
  stock?: number;
  stockUnit?: string;
  isAvailable?: boolean;
}) {
  const [product] = await db
    .insert(products)
    .values({
      name: data.name,
      variety: data.variety,
      weightGrams: data.weightGrams,
      priceJpy: data.priceJpy,
      description: data.description ?? null,
      stock: data.stock ?? 0,
      stockUnit: data.stockUnit ?? "kg",
      isAvailable: data.isAvailable ?? true,
    })
    .returning();
  return product;
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    variety: string;
    weightGrams: number;
    priceJpy: number;
    description: string | null;
    stock: number;
    stockUnit: string;
    isAvailable: boolean;
  }>
) {
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: string) {
  await db.delete(products).where(eq(products.id, id));
}

/**
 * 1回の購入で消費する在庫量を計算する。
 * - kg: quantity × weightGrams / 1000
 * - その他 (箱, 個 etc.): quantity × 1
 */
export function calcStockConsumption(
  quantity: number,
  weightGrams: number,
  stockUnit: string
): number {
  if (stockUnit === "kg") {
    return (quantity * weightGrams) / 1000;
  }
  return quantity;
}

/**
 * 1回の購入で消費する在庫量を計算する（kg単位版）。
 * quantity × weightKg (string → number変換)
 */
export function calcStockConsumptionKg(
  quantity: number,
  weightKg: string
): number {
  return quantity * Number(weightKg);
}

/**
 * 在庫を原子的に減算する。在庫不足の場合は空配列を返す。
 */
export async function deductStock(id: string, amount: number) {
  return db
    .update(products)
    .set({ stock: sql`${products.stock} - ${amount}` })
    .where(and(eq(products.id, id), gte(products.stock, amount)))
    .returning();
}

/**
 * 在庫を復元する（キャンセル時）。
 */
export async function restoreStock(id: string, amount: number) {
  await db
    .update(products)
    .set({ stock: sql`${products.stock} + ${amount}` })
    .where(eq(products.id, id));
}

/**
 * 在庫を原子的に減算する（stockKg版）。在庫不足の場合は空配列を返す。
 */
export async function deductStockKg(productId: string, amountKg: number) {
  return db
    .update(products)
    .set({ stockKg: sql`${products.stockKg} - ${amountKg}` })
    .where(
      and(
        eq(products.id, productId),
        gte(products.stockKg, String(amountKg))
      )
    )
    .returning();
}

/**
 * 在庫を復元する（stockKg版、キャンセル時）。
 */
export async function restoreStockKg(productId: string, amountKg: number) {
  await db
    .update(products)
    .set({ stockKg: sql`${products.stockKg} + ${amountKg}` })
    .where(eq(products.id, productId));
}
