"use client";

import { useState } from "react";

type ProductCardProps = {
  id: string;
  name: string;
  variety: string;
  weightGrams: number;
  priceJpy: number;
  imageUrl: string | null;
  description: string | null;
  stock: number;
  stockUnit: string;
  onAddToCart: (id: string, quantity: number) => void;
};

function calcMaxQuantity(
  stock: number,
  weightGrams: number,
  stockUnit: string
): number {
  if (stockUnit === "kg") {
    const weightKg = weightGrams / 1000;
    return Math.floor(stock / weightKg);
  }
  return stock;
}

export function ProductCard({
  name,
  variety,
  weightGrams,
  priceJpy,
  imageUrl,
  description,
  stock,
  stockUnit,
  id,
  onAddToCart,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = calcMaxQuantity(stock, weightGrams, stockUnit);
  const isSoldOut = maxQuantity < 1;

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${isSoldOut ? "opacity-60" : ""}`}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className="mb-3 h-48 w-full rounded-md object-cover"
        />
      )}
      <h3 className="text-lg font-bold text-gray-900">{name}</h3>
      <p className="text-sm text-gray-700">
        {variety} / {weightGrams}g
      </p>
      {description && <p className="mt-1 text-sm text-gray-800">{description}</p>}
      <p className="mt-1 text-xs text-gray-500">
        残り {stock}{stockUnit}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xl font-bold text-orange-600">
          ¥{priceJpy.toLocaleString()}
        </span>
        {isSoldOut ? (
          <span className="rounded-full bg-gray-400 px-4 py-2 text-sm font-medium text-white">
            売り切れ
          </span>
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
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              className="h-8 w-8 rounded-full border text-center text-gray-900 disabled:opacity-30"
            >
              +
            </button>
            <button
              onClick={() => {
                onAddToCart(id, quantity);
                setQuantity(1);
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
