"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { addToCartByVariant } from "@/app/actions/cart";
import type { ProductWithVariants } from "@/types";

export function ProductList({ products }: { products: ProductWithVariants[] }) {
  const [isPending, startTransition] = useTransition();

  function handleAddToCart(variantId: string, quantity: number, productName: string) {
    toast.success(`${productName} を ${quantity}個 カートに追加しました`);
    startTransition(async () => {
      const result = await addToCartByVariant(variantId, quantity);

      if (!result.success) {
        toast.error(result.error || "カートへの追加に失敗しました");
      }
    });
  }

  return products.length === 0 ? (
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
          isPending={isPending}
        />
      ))}
    </div>
  );
}
