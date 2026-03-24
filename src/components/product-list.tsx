"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { addToCartByVariant } from "@/app/actions/cart";
import { useCartCount } from "@/components/cart-count-provider";
import type { ProductWithVariants } from "@/types";

export function ProductList({ products }: { products: ProductWithVariants[] }) {
  const [isPending, startTransition] = useTransition();
  const { incrementCount } = useCartCount();

  function handleAddToCart(variantId: string, quantity: number, productName: string) {
    const toastId = toast.success(`${productName} を ${quantity}個 カートに追加しました`);
    startTransition(async () => {
      const result = await addToCartByVariant(variantId, quantity);

      if (result.success) {
        incrementCount(quantity);
      } else {
        toast.dismiss(toastId);
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
