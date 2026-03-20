"use client";

import { useState, useTransition } from "react";
import { ProductCard } from "@/components/product-card";
import { addToCartByVariant } from "@/app/actions/cart";
import type { ProductWithVariants } from "@/types";

export function ProductList({ products }: { products: ProductWithVariants[] }) {
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAddToCart(variantId: string, quantity: number, productName: string) {
    startTransition(async () => {
      const result = await addToCartByVariant(variantId, quantity);

      if (result.success) {
        setToast(`${productName} を ${quantity}個 カートに追加しました`);
        setTimeout(() => setToast(null), 2000);
      } else {
        setToast(result.error);
        setTimeout(() => setToast(null), 3000);
      }
    });
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
              product={product}
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
