import { describe, it, expect } from "vitest";
import type { ProductVariant, ProductWithVariants } from "@/types";
import {
  getVariantEdit,
  isVariantDirty,
  getDirtyVariants,
  buildProductsAfterVariantSave,
} from "./products-manager.utils";
import type { VariantEdit } from "./products-manager.utils";

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "v1",
    productId: "p1",
    label: "3kg",
    weightKg: "3",
    priceJpy: 1800,
    isGiftOnly: false,
    displayOrder: 0,
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProduct(
  overrides: Partial<ProductWithVariants> = {},
  variants: ProductVariant[] = [makeVariant()]
): ProductWithVariants {
  return {
    id: "p1",
    name: "早生みかん",
    stockKg: 100,
    imageUrl: null,
    isAvailable: true,
    description: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants,
    ...overrides,
  };
}

describe("getVariantEdit", () => {
  it("editsに存在しない場合、variantの値からVariantEditを生成する", () => {
    const v = makeVariant({ label: "5kg", priceJpy: 2800, isGiftOnly: true, isAvailable: false });
    const result = getVariantEdit(v, {});
    expect(result).toEqual({
      label: "5kg",
      priceJpy: "2800",
      isGiftOnly: true,
      isAvailable: false,
    });
  });

  it("editsに存在する場合、editsの値を返す", () => {
    const v = makeVariant();
    const edits: Record<string, VariantEdit> = {
      v1: { label: "edited", priceJpy: "9999", isGiftOnly: true, isAvailable: false },
    };
    const result = getVariantEdit(v, edits);
    expect(result).toEqual({
      label: "edited",
      priceJpy: "9999",
      isGiftOnly: true,
      isAvailable: false,
    });
  });
});

describe("isVariantDirty", () => {
  it("editsに存在しない場合、falseを返す", () => {
    expect(isVariantDirty(makeVariant(), {})).toBe(false);
  });

  it("editsが元の値と同じ場合、falseを返す", () => {
    const v = makeVariant();
    const edits: Record<string, VariantEdit> = {
      v1: { label: "3kg", priceJpy: "1800", isGiftOnly: false, isAvailable: true },
    };
    expect(isVariantDirty(v, edits)).toBe(false);
  });

  it("labelが変更されている場合、trueを返す", () => {
    const v = makeVariant();
    const edits: Record<string, VariantEdit> = {
      v1: { label: "5kg", priceJpy: "1800", isGiftOnly: false, isAvailable: true },
    };
    expect(isVariantDirty(v, edits)).toBe(true);
  });

  it("priceJpyが変更されている場合、trueを返す", () => {
    const v = makeVariant();
    const edits: Record<string, VariantEdit> = {
      v1: { label: "3kg", priceJpy: "2000", isGiftOnly: false, isAvailable: true },
    };
    expect(isVariantDirty(v, edits)).toBe(true);
  });

  it("isGiftOnlyが変更されている場合、trueを返す", () => {
    const v = makeVariant();
    const edits: Record<string, VariantEdit> = {
      v1: { label: "3kg", priceJpy: "1800", isGiftOnly: true, isAvailable: true },
    };
    expect(isVariantDirty(v, edits)).toBe(true);
  });
});

describe("getDirtyVariants", () => {
  it("商品が見つからない場合、空配列を返す", () => {
    expect(getDirtyVariants([], "nonexistent", {})).toEqual([]);
  });

  it("dirtyなバリエーションのみを返す", () => {
    const v1 = makeVariant({ id: "v1" });
    const v2 = makeVariant({ id: "v2", label: "5kg", priceJpy: 2800 });
    const product = makeProduct({}, [v1, v2]);
    const edits: Record<string, VariantEdit> = {
      v1: { label: "changed", priceJpy: "1800", isGiftOnly: false, isAvailable: true },
    };
    const result = getDirtyVariants([product], "p1", edits);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("v1");
  });
});

describe("buildProductsAfterVariantSave", () => {
  it("成功分のみ更新し、失敗分はそのまま残す", () => {
    const v1 = makeVariant({ id: "v1" });
    const v2 = makeVariant({ id: "v2", label: "5kg", priceJpy: 2800 });
    const product = makeProduct({}, [v1, v2]);

    const results = [
      { variantId: "v1", edit: { label: "changed", priceJpy: "9999", isGiftOnly: true, isAvailable: false }, success: true },
      { variantId: "v2", edit: { label: "also-changed", priceJpy: "1", isGiftOnly: false, isAvailable: false }, success: false },
    ];

    const updated = buildProductsAfterVariantSave([product], "p1", results);
    expect(updated[0].variants[0].label).toBe("changed");
    expect(updated[0].variants[0].priceJpy).toBe(9999);
    expect(updated[0].variants[0].isGiftOnly).toBe(true);
    expect(updated[0].variants[0].isAvailable).toBe(false);
    // v2 は失敗なので元のまま
    expect(updated[0].variants[1].label).toBe("5kg");
    expect(updated[0].variants[1].priceJpy).toBe(2800);
  });

  it("全て失敗の場合、productsをそのまま返す", () => {
    const products = [makeProduct()];
    const results = [
      { variantId: "v1", edit: { label: "x", priceJpy: "1", isGiftOnly: false, isAvailable: false }, success: false },
    ];
    const updated = buildProductsAfterVariantSave(products, "p1", results);
    expect(updated).toBe(products); // 参照同一性
    expect(updated[0].variants[0].label).toBe("3kg");
  });
});
