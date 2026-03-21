import type { ProductVariant, ProductWithVariants } from "@/types";

export type VariantDraft = {
  label: string;
  weightKg: string;
  priceJpy: string;
  isGiftOnly: boolean;
};

export type VariantEdit = {
  label: string;
  priceJpy: string;
  isGiftOnly: boolean;
  isAvailable: boolean;
};

export const emptyVariant: VariantDraft = {
  label: "",
  weightKg: "",
  priceJpy: "",
  isGiftOnly: false,
};

export function getVariantEdit(
  v: ProductVariant,
  edits: Record<string, VariantEdit>
): VariantEdit {
  return (
    edits[v.id] ?? {
      label: v.label,
      priceJpy: String(v.priceJpy),
      isGiftOnly: v.isGiftOnly,
      isAvailable: v.isAvailable,
    }
  );
}

export function isVariantDirty(
  v: ProductVariant,
  edits: Record<string, VariantEdit>
): boolean {
  const edit = edits[v.id];
  if (!edit) return false;
  return (
    edit.label !== v.label ||
    edit.priceJpy !== String(v.priceJpy) ||
    edit.isGiftOnly !== v.isGiftOnly ||
    edit.isAvailable !== v.isAvailable
  );
}

export function getDirtyVariants(
  products: ProductWithVariants[],
  productId: string,
  edits: Record<string, VariantEdit>
): ProductVariant[] {
  const product = products.find((p) => p.id === productId);
  if (!product) return [];
  return product.variants.filter((v) => isVariantDirty(v, edits));
}

export function buildProductsAfterVariantSave(
  products: ProductWithVariants[],
  productId: string,
  results: Array<{
    variantId: string;
    edit: VariantEdit;
    success: boolean;
  }>
): ProductWithVariants[] {
  const successMap = new Map(
    results
      .filter((r) => r.success)
      .map((r) => [r.variantId, r.edit])
  );
  if (successMap.size === 0) return products;

  return products.map((p) =>
    p.id === productId
      ? {
          ...p,
          variants: p.variants.map((v) => {
            const edit = successMap.get(v.id);
            if (!edit) return v;
            return {
              ...v,
              label: edit.label,
              priceJpy: Number(edit.priceJpy),
              isGiftOnly: edit.isGiftOnly,
              isAvailable: edit.isAvailable,
            };
          }),
        }
      : p
  );
}
