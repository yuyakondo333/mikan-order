"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(setProducts);
  }, []);

  async function toggleAvailability(id: string, isAvailable: boolean) {
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isAvailable: !isAvailable }),
    });
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isAvailable: !isAvailable } : p
      )
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">商品管理</h1>
      {products.length === 0 ? (
        <p className="text-gray-500">商品はありません</p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-bold">{product.name}</p>
                <p className="text-sm text-gray-500">
                  {product.variety} / {product.weightGrams}g /
                  ¥{product.priceJpy.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  toggleAvailability(product.id, product.isAvailable)
                }
                className={`rounded px-4 py-1 text-sm font-medium ${
                  product.isAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {product.isAvailable ? "販売中" : "非公開"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
