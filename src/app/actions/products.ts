"use server";

import { z } from "zod";
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
import {
  uuidSchema,
  newProductSchema,
  updateProductSchema,
  variantSchema,
  updateVariantSchema,
} from "@/lib/validations";

export async function deleteProductAction(id: unknown) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "入力内容に誤りがあります" };
  }

  try {
    await deleteProduct(parsed.data);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to delete product:", e);
    return { success: false, error: "商品の削除に失敗しました" };
  }
}

export async function toggleProductAvailabilityAction(
  id: unknown,
  isAvailable: unknown
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsedId = uuidSchema.safeParse(id);
  const parsedAvailable = z.boolean().safeParse(isAvailable);
  if (!parsedId.success || !parsedAvailable.success) {
    return { success: false, error: "入力内容に誤りがあります" };
  }

  try {
    if (parsedAvailable.data) {
      const count = await countVariantsByProductId(parsedId.data);
      if (count === 0) {
        return { success: false, error: "バリエーションがない商品は公開できません" };
      }
    }
    await updateProduct(parsedId.data, { isAvailable: parsedAvailable.data });
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to toggle product availability:", e);
    return { success: false, error: "商品の更新に失敗しました" };
  }
}

export async function createProductWithVariantsAction(
  productData: unknown,
  variants: unknown
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsedProduct = newProductSchema.safeParse(productData);
  const parsedVariants = z.array(variantSchema).safeParse(variants);
  if (!parsedProduct.success || !parsedVariants.success) {
    return { success: false, error: "入力内容に誤りがあります" };
  }

  try {
    const product = await createProduct({
      name: parsedProduct.data.name,
      variety: parsedProduct.data.name,
      weightGrams: 0,
      priceJpy: 0,
      description: parsedProduct.data.description,
      stock: 0,
      stockUnit: "kg",
      isAvailable: parsedVariants.data.length === 0 ? false : parsedProduct.data.isAvailable,
    });

    const createdVariants = await Promise.all(
      parsedVariants.data.map((v) =>
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
  id: unknown,
  data: unknown
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsedId = uuidSchema.safeParse(id);
  const parsedData = updateProductSchema.safeParse(data);
  if (!parsedId.success || !parsedData.success) {
    return { success: false, error: "入力内容に誤りがあります" };
  }

  try {
    if (parsedData.data.isAvailable === true) {
      const count = await countVariantsByProductId(parsedId.data);
      if (count === 0) {
        return { success: false, error: "バリエーションがない商品は公開できません" };
      }
    }
    await updateProduct(parsedId.data, parsedData.data);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to update product:", e);
    return { success: false, error: "商品の更新に失敗しました" };
  }
}

export async function createVariantAction(
  productId: unknown,
  data: unknown
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsedId = uuidSchema.safeParse(productId);
  const parsedData = variantSchema.safeParse(data);
  if (!parsedId.success || !parsedData.success) {
    return { success: false, error: "入力内容に誤りがあります" };
  }

  try {
    const variant = await createVariant({ productId: parsedId.data, ...parsedData.data });
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true, variant };
  } catch (e) {
    console.error("Failed to create variant:", e);
    return { success: false, error: "バリエーションの作成に失敗しました" };
  }
}

export async function updateVariantAction(
  variantId: unknown,
  data: unknown
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsedId = uuidSchema.safeParse(variantId);
  const parsedData = updateVariantSchema.safeParse(data);
  if (!parsedId.success || !parsedData.success) {
    return { success: false, error: "入力内容に誤りがあります" };
  }

  try {
    await updateVariant(parsedId.data, parsedData.data);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to update variant:", e);
    return { success: false, error: "バリエーションの更新に失敗しました" };
  }
}

export async function deleteVariantAction(
  variantId: unknown,
  productId: unknown
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsedVariantId = uuidSchema.safeParse(variantId);
  const parsedProductId = uuidSchema.safeParse(productId);
  if (!parsedVariantId.success || !parsedProductId.success) {
    return { success: false, error: "入力内容に誤りがあります" };
  }

  try {
    const count = await countVariantsByProductId(parsedProductId.data);
    if (count <= 1) {
      return {
        success: false,
        error: "最低1つのバリエーションが必要です",
      };
    }

    await deleteVariant(parsedVariantId.data);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true };
  } catch (e) {
    console.error("Failed to delete variant:", e);
    return { success: false, error: "バリエーションの削除に失敗しました" };
  }
}
