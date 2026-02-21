"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(setProducts);
  }, []);

  function handleAddToCart(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("cart") ?? "[]");
    const existing = cart.find((item: { id: string }) => item.id === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        priceJpy: product.priceJpy,
        quantity: 1,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("カートに追加しました");
  }

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">商品一覧</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
      {products.length === 0 && (
        <p className="text-center text-gray-500">商品を読み込み中...</p>
      )}
    </div>
  );
}
