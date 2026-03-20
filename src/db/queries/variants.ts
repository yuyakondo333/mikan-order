import "server-only";

import { db } from "@/db";
import { productVariants } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function createVariant(data: {
  productId: string;
  label: string;
  weightKg: string;
  priceJpy: number;
  isGiftOnly?: boolean;
  displayOrder?: number;
  isAvailable?: boolean;
}) {
  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: data.productId,
      label: data.label,
      weightKg: data.weightKg,
      priceJpy: data.priceJpy,
      isGiftOnly: data.isGiftOnly ?? false,
      displayOrder: data.displayOrder ?? 0,
      isAvailable: data.isAvailable ?? true,
    })
    .returning();
  return variant;
}

export async function updateVariant(
  id: string,
  data: Partial<{
    label: string;
    weightKg: string;
    priceJpy: number;
    isGiftOnly: boolean;
    displayOrder: number;
    isAvailable: boolean;
  }>
) {
  await db
    .update(productVariants)
    .set(data)
    .where(eq(productVariants.id, id));
}

export async function deleteVariant(id: string) {
  await db.delete(productVariants).where(eq(productVariants.id, id));
}

export async function countVariantsByProductId(
  productId: string
): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  return result[0]?.count ?? 0;
}
