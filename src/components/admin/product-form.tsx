"use client";

import { useState } from "react";
import {
  createProductWithVariantsAction,
  updateProductV2Action,
} from "@/app/actions/products";
import type { ProductWithVariants } from "@/types";
import { type VariantDraft, emptyVariant } from "./products-manager.utils";

type Props = {
  editingProduct?: ProductWithVariants;
  onCreated: (product: ProductWithVariants) => void;
  onUpdated: (productId: string, data: { name: string; stockKg: number; description: string | null; isAvailable: boolean }) => void;
  onCancel: () => void;
};

export function ProductForm({ editingProduct, onCreated, onUpdated, onCancel }: Props) {
  const [name, setName] = useState(editingProduct?.name ?? "");
  const [stockKg, setStockKg] = useState(String(editingProduct?.stockKg ?? "0"));
  const [description, setDescription] = useState(editingProduct?.description ?? "");
  const [isAvailable, setIsAvailable] = useState(editingProduct?.isAvailable ?? true);
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...emptyVariant }]);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (variants.some((v) => !v.label.trim() || !v.weightKg || !v.priceJpy)) return;

    setSubmitting(true);
    try {
      const result = await createProductWithVariantsAction(
        {
          name,
          stockKg: Number(stockKg),
          description: description || undefined,
          isAvailable,
        },
        variants.map((v) => ({
          label: v.label,
          weightKg: v.weightKg,
          priceJpy: Number(v.priceJpy),
          isGiftOnly: v.isGiftOnly,
        }))
      );
      if (result.success && result.product) {
        const newProduct: ProductWithVariants = {
          ...result.product,
          stockKg: Number(stockKg),
          imageUrl: null,
          isAvailable,
          description: description || null,
          variants: result.variants ?? [],
        };
        onCreated(newProduct);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editingProduct) return;
    setSubmitting(true);
    try {
      const stockKgNum = Number(stockKg);
      await updateProductV2Action(editingProduct.id, {
        name,
        stockKg: stockKgNum,
        description: description || null,
        isAvailable,
      });
      onUpdated(editingProduct.id, {
        name,
        stockKg: stockKgNum,
        description: description || null,
        isAvailable,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (editingProduct) {
          handleUpdate();
        } else {
          handleCreate(e);
        }
      }}
      className="mb-6 space-y-4 rounded-lg bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-xl font-bold text-gray-900">
        {editingProduct ? "商品を編集" : "新しい商品を追加"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-lg font-medium text-gray-900">
            商品名 *
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border p-3 text-lg text-gray-900"
          />
        </div>
        <div>
          <label className="block text-lg font-medium text-gray-900">
            在庫 (kg)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={stockKg}
            onChange={(e) => setStockKg(e.target.value)}
            className="mt-1 w-full rounded border p-3 text-lg text-gray-900"
          />
        </div>
      </div>
      <div>
        <label className="block text-lg font-medium text-gray-900">
          説明
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded border p-3 text-lg text-gray-900"
        />
      </div>
      <label className="flex items-center gap-3 text-lg text-gray-900">
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="h-6 w-6"
        />
        公開する
      </label>

      {/* バリエーション（新規作成時のみ） */}
      {!editingProduct && (
        <div className="border-t pt-4">
          <h3 className="mb-2 text-lg font-bold text-gray-900">バリエーション</h3>
          {variants.map((v, i) => (
            <div key={i} className="mb-3 rounded border border-gray-200 p-3 sm:border-0 sm:p-0">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
                <input
                  required
                  placeholder="ラベル (3kg)"
                  value={v.label}
                  onChange={(e) => {
                    const newVars = [...variants];
                    newVars[i] = { ...v, label: e.target.value };
                    setVariants(newVars);
                  }}
                  className="rounded border p-3 text-lg text-gray-900 sm:w-36"
                />
                <input
                  required
                  type="number"
                  step="0.001"
                  placeholder="重量kg"
                  value={v.weightKg}
                  onChange={(e) => {
                    const newVars = [...variants];
                    newVars[i] = { ...v, weightKg: e.target.value };
                    setVariants(newVars);
                  }}
                  className="rounded border p-3 text-lg text-gray-900 sm:w-32"
                />
                <input
                  required
                  type="number"
                  placeholder="価格"
                  value={v.priceJpy}
                  onChange={(e) => {
                    const newVars = [...variants];
                    newVars[i] = { ...v, priceJpy: e.target.value };
                    setVariants(newVars);
                  }}
                  className="rounded border p-3 text-lg text-gray-900 sm:w-32"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 text-lg text-gray-900">
                    <input
                      type="checkbox"
                      checked={v.isGiftOnly}
                      onChange={(e) => {
                        const newVars = [...variants];
                        newVars[i] = { ...v, isGiftOnly: e.target.checked };
                        setVariants(newVars);
                      }}
                      className="h-6 w-6"
                    />
                    贈答用
                  </label>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                      className="cursor-pointer rounded px-2 py-1 text-base font-medium text-red-600 hover:bg-red-50 sm:ml-3"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setVariants([...variants, { ...emptyVariant }])}
            className="cursor-pointer rounded-md px-3 py-2 text-base font-medium text-orange-600 hover:bg-orange-50"
          >
            + バリエーション追加
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded bg-orange-500 px-6 py-3 text-lg font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting ? "保存中..." : editingProduct ? "更新する" : "追加する"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded bg-gray-200 px-6 py-3 text-lg font-medium text-gray-900 hover:bg-gray-300"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
