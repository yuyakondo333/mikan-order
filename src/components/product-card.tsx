"use client";

import { useState } from "react";
import type { ProductWithVariants, ProductVariant } from "@/types";

type ProductCardProps = {
  product: ProductWithVariants;
  onAddToCart: (variantId: string, quantity: number, productName: string) => void;
};

function calcMaxQuantity(stockKg: string, weightKg: string): number {
  const stock = Number(stockKg);
  const weight = Number(weightKg);
  if (weight <= 0) return 0;
  return Math.floor(stock / weight);
}

function isVariantAvailable(stockKg: string, weightKg: string): boolean {
  return Number(weightKg) <= Number(stockKg);
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { variants } = product;
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  // 全バリエーションが在庫不足 → 売り切れ
  const allSoldOut = variants.every(
    (v) => !isVariantAvailable(product.stockKg, v.weightKg)
  );

  const maxQuantity = selectedVariant
    ? calcMaxQuantity(product.stockKg, selectedVariant.weightKg)
    : 0;
  const currentVariantSoldOut = maxQuantity < 1;

  // 最低価格
  const minPrice = Math.min(...variants.map((v) => v.priceJpy));
  const hasMultipleVariants = variants.length > 1;

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm ${allSoldOut ? "opacity-60" : ""}`}
    >
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="mb-3 h-48 w-full rounded-md object-cover"
        />
      )}
      <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
      {product.description && (
        <p className="mt-1 text-sm text-gray-800">{product.description}</p>
      )}

      {/* バリエーション選択 */}
      {hasMultipleVariants && (
        <div className="mt-3 flex flex-wrap gap-2">
          {variants.map((v) => {
            const available = isVariantAvailable(product.stockKg, v.weightKg);
            return (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVariantId(v.id);
                  setQuantity(1);
                }}
                disabled={!available}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  v.id === selectedVariantId
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : available
                      ? "border-gray-300 text-gray-700 hover:border-orange-300"
                      : "border-gray-200 text-gray-400 line-through"
                }`}
              >
                {v.label} ¥{v.priceJpy.toLocaleString()}
                {v.isGiftOnly && " 🎁"}
              </button>
            );
          })}
        </div>
      )}

      {/* 価格表示 */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xl font-bold text-orange-600">
          {selectedVariant
            ? `¥${selectedVariant.priceJpy.toLocaleString()}`
            : hasMultipleVariants
              ? `¥${minPrice.toLocaleString()}〜`
              : `¥${minPrice.toLocaleString()}`}
        </span>

        {allSoldOut ? (
          <span className="rounded-full bg-gray-400 px-4 py-2 text-sm font-medium text-white">
            売り切れ
          </span>
        ) : currentVariantSoldOut ? (
          <span className="text-sm text-gray-500">在庫なし</span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="h-8 w-8 rounded-full border text-center text-gray-900 disabled:opacity-30"
            >
              -
            </button>
            <span className="w-6 text-center text-gray-900">{quantity}</span>
            <button
              onClick={() =>
                setQuantity((q) => Math.min(maxQuantity, q + 1))
              }
              disabled={quantity >= maxQuantity}
              className="h-8 w-8 rounded-full border text-center text-gray-900 disabled:opacity-30"
            >
              +
            </button>
            <button
              onClick={() => {
                if (selectedVariant) {
                  onAddToCart(selectedVariant.id, quantity, product.name);
                  setQuantity(1);
                }
              }}
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              カートに追加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
