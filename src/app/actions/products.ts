"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/db/queries/products";

export async function createProductAction(data: {
  name: string;
  variety: string;
  weightGrams: number;
  priceJpy: number;
  description?: string | null;
  isAvailable?: boolean;
}) {
  try {
    const product = await createProduct(data);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true, product };
  } catch (e) {
    console.error("Failed to create product:", e);
    return { success: false, error: "商品の作成に失敗しました" };
  }
}

export async function updateProductAction(
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
  try {
    await updateProduct(id, data);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to update product:", e);
    return { success: false, error: "商品の更新に失敗しました" };
  }
}

export async function deleteProductAction(id: string) {
  try {
    await deleteProduct(id);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to delete product:", e);
    return { success: false, error: "商品の削除に失敗しました" };
  }
}

export async function toggleProductAvailabilityAction(
  id: string,
  isAvailable: boolean
) {
  try {
    await updateProduct(id, { isAvailable });
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to toggle product availability:", e);
    return { success: false, error: "商品の更新に失敗しました" };
  }
}
