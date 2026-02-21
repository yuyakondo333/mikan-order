import "server-only";

import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAvailableProducts() {
  return db
    .select()
    .from(products)
    .where(eq(products.isAvailable, true));
}

export async function getAllProducts() {
  return db.select().from(products);
}

export async function createProduct(data: {
  name: string;
  variety: string;
  weightGrams: number;
  priceJpy: number;
  description?: string | null;
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
    isAvailable: boolean;
  }>
) {
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: string) {
  await db.delete(products).where(eq(products.id, id));
}
