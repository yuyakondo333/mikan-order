"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(setProducts);
  }, []);

  function handleAddToCart(productId: string, quantity: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("cart") ?? "[]");
    const existing = cart.find((item: { id: string }) => item.id === productId);
    if (existing) {
      existing.quantity += quantity;
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
        <p className="text-center text-gray-700">商品を読み込み中...</p>
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-gray-800 px-6 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
