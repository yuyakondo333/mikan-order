"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/db/queries/products";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  countVariantsByProductId,
} from "@/db/queries/variants";
import { verifyAdmin } from "@/lib/admin-auth";

export async function deleteProductAction(id: string) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

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
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  try {
    if (isAvailable) {
      const count = await countVariantsByProductId(id);
      if (count === 0) {
        return { success: false, error: "バリエーションがない商品は公開できません" };
      }
    }
    await updateProduct(id, { isAvailable });
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to toggle product availability:", e);
    return { success: false, error: "商品の更新に失敗しました" };
  }
}

export async function createProductWithVariantsAction(
  productData: {
    name: string;
    stockKg?: number;
    description?: string | null;
    isAvailable?: boolean;
  },
  variants: {
    label: string;
    weightKg: string;
    priceJpy: number;
    isGiftOnly?: boolean;
    displayOrder?: number;
    isAvailable?: boolean;
  }[]
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  try {
    const product = await createProduct({
      name: productData.name,
      variety: productData.name,
      weightGrams: 0,
      priceJpy: 0,
      description: productData.description,
      stock: 0,
      stockUnit: "kg",
      isAvailable: variants.length === 0 ? false : productData.isAvailable,
    });

    const createdVariants = await Promise.all(
      variants.map((v) =>
        createVariant({
          productId: product.id,
          ...v,
        })
      )
    );

    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true, product, variants: createdVariants };
  } catch (e) {
    console.error("Failed to create product with variants:", e);
    return { success: false, error: "商品の作成に失敗しました" };
  }
}

export async function updateProductV2Action(
  id: string,
  data: Partial<{
    name: string;
    stockKg: number;
    description: string | null;
    isAvailable: boolean;
  }>
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  try {
    if (data.isAvailable === true) {
      const count = await countVariantsByProductId(id);
      if (count === 0) {
        return { success: false, error: "バリエーションがない商品は公開できません" };
      }
    }
    await updateProduct(id, data as never);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to update product:", e);
    return { success: false, error: "商品の更新に失敗しました" };
  }
}

export async function createVariantAction(
  productId: string,
  data: {
    label: string;
    weightKg: string;
    priceJpy: number;
    isGiftOnly?: boolean;
    displayOrder?: number;
    isAvailable?: boolean;
  }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  try {
    const variant = await createVariant({ productId, ...data });
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true, variant };
  } catch (e) {
    console.error("Failed to create variant:", e);
    return { success: false, error: "バリエーションの作成に失敗しました" };
  }
}

export async function updateVariantAction(
  variantId: string,
  data: Partial<{
    label: string;
    weightKg: string;
    priceJpy: number;
    isGiftOnly: boolean;
    displayOrder: number;
    isAvailable: boolean;
  }>
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  try {
    await updateVariant(variantId, data);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to update variant:", e);
    return { success: false, error: "バリエーションの更新に失敗しました" };
  }
}

export async function deleteVariantAction(
  variantId: string,
  productId: string
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  try {
    const count = await countVariantsByProductId(productId);
    if (count <= 1) {
      return {
        success: false,
        error: "最低1つのバリエーションが必要です",
      };
    }

    await deleteVariant(variantId);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to delete variant:", e);
    return { success: false, error: "バリエーションの削除に失敗しました" };
  }
}
