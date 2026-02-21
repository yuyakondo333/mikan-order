"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";

type ProductForm = {
  name: string;
  variety: string;
  weightGrams: string;
  priceJpy: string;
  description: string;
  isAvailable: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  variety: "",
  weightGrams: "",
  priceJpy: "",
  description: "",
  isAvailable: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products?all=true");
      const data = await res.json();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      variety: product.variety,
      weightGrams: String(product.weightGrams),
      priceJpy: String(product.priceJpy),
      description: product.description ?? "",
      isAvailable: product.isAvailable,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      variety: form.variety,
      weightGrams: Number(form.weightGrams),
      priceJpy: Number(form.priceJpy),
      description: form.description || null,
      isAvailable: form.isAvailable,
    };

    try {
      if (editingId) {
        await fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      cancelForm();
      await fetchProducts();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この商品を削除しますか？")) return;

    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchProducts();
  }

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <button
          onClick={openAddForm}
          className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          + 商品を追加
        </button>
      </div>

      {/* 追加・編集フォーム */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow-sm"
        >
          <h2 className="font-bold">
            {editingId ? "商品を編集" : "新しい商品を追加"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                商品名 *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                品種 *
              </label>
              <input
                required
                value={form.variety}
                onChange={(e) => setForm({ ...form, variety: e.target.value })}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                重量 (g) *
              </label>
              <input
                required
                type="number"
                min="1"
                value={form.weightGrams}
                onChange={(e) =>
                  setForm({ ...form, weightGrams: e.target.value })
                }
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                価格 (円) *
              </label>
              <input
                required
                type="number"
                min="1"
                value={form.priceJpy}
                onChange={(e) =>
                  setForm({ ...form, priceJpy: e.target.value })
                }
                className="mt-1 w-full rounded border p-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              説明
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="mt-1 w-full rounded border p-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) =>
                setForm({ ...form, isAvailable: e.target.checked })
              }
            />
            公開する
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting
                ? "保存中..."
                : editingId
                  ? "更新する"
                  : "追加する"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* 商品一覧 */}
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-500">商品はありません</p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-lg bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-bold">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    {product.variety} / {product.weightGrams}g /
                    ¥{product.priceJpy.toLocaleString()}
                  </p>
                  {product.description && (
                    <p className="mt-1 text-sm text-gray-400">
                      {product.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    toggleAvailability(product.id, product.isAvailable)
                  }
                  className={`rounded px-3 py-1 text-xs font-medium ${
                    product.isAvailable
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {product.isAvailable ? "販売中" : "非公開"}
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEditForm(product)}
                  className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
