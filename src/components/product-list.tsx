"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types";

function calcStockConsumption(
  quantity: number,
  weightGrams: number,
  stockUnit: string
): number {
  if (stockUnit === "kg") {
    return (quantity * weightGrams) / 1000;
  }
  return quantity;
}

export function ProductList({ products }: { products: Product[] }) {
  const [toast, setToast] = useState<string | null>(null);

  function handleAddToCart(productId: string, quantity: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // 在庫チェック（カート内の既存数量も考慮）
    const cart = JSON.parse(localStorage.getItem("cart") ?? "[]");
    const existing = cart.find((item: { id: string }) => item.id === productId);
    const currentQty = existing ? existing.quantity : 0;
    const totalQty = currentQty + quantity;
    const required = calcStockConsumption(
      totalQty,
      product.weightGrams,
      product.stockUnit
    );

    if (required > product.stock) {
      setToast(`在庫が不足しています（残り${product.stock}${product.stockUnit}）`);
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (existing) {
      existing.quantity = totalQty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        priceJpy: product.priceJpy,
        quantity,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));

    setToast(`${product.name} を ${quantity}個 カートに追加しました`);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <>
      {products.length === 0 ? (
        <p className="text-center text-gray-500">
          現在販売中の商品はありません
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-gray-800 px-6 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
