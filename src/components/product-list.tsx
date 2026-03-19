"use client";

import { useState, useTransition } from "react";
import { ProductCard } from "@/components/product-card";
import { addToCart } from "@/app/actions/cart";
import type { Product } from "@/types";

export function ProductList({ products }: { products: Product[] }) {
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAddToCart(productId: string, quantity: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    startTransition(async () => {
      const result = await addToCart(productId, quantity);

      if (result.success) {
        setToast(`${product.name} を ${quantity}個 カートに追加しました`);
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
