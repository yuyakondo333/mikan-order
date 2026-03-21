"use client";

import { useState } from "react";
import type { ProductWithVariants } from "@/types";
import { ProductForm } from "./product-form";
import { ProductCard } from "./product-card";

export function AdminProductsManager({
  initialProducts,
}: {
  initialProducts: ProductWithVariants[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  function openAddForm() {
    setEditingProduct(null);
    setShowForm(true);
  }

  function openEditForm(product: ProductWithVariants) {
    setEditingProduct(product);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
  }

  function handleCreated(newProduct: ProductWithVariants) {
    setProducts((prev) => [...prev, newProduct]);
    closeForm();
  }

  function handleUpdated(
    productId: string,
    data: { name: string; stockKg: number; description: string | null; isAvailable: boolean }
  ) {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...data } : p))
    );
    closeForm();
  }

  function handleProductChange(updated: ProductWithVariants) {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  }

  function handleProductDelete(productId: string) {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
        <button
          onClick={openAddForm}
          className="cursor-pointer rounded bg-orange-500 px-6 py-3 text-lg font-medium text-white hover:bg-orange-600"
        >
          + 商品を追加
        </button>
      </div>

      {showForm && (
        <ProductForm
          editingProduct={editingProduct ?? undefined}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          onCancel={closeForm}
        />
      )}

      {products.length === 0 ? (
        <p className="text-lg text-gray-900">商品はありません</p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              expanded={expandedProduct === product.id}
              onToggleExpand={() =>
                setExpandedProduct(
                  expandedProduct === product.id ? null : product.id
                )
              }
              onEdit={() => openEditForm(product)}
              onProductChange={handleProductChange}
              onProductDelete={handleProductDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
