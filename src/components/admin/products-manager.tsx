"use client";

import { useState } from "react";
import {
  createProductWithVariantsAction,
  updateProductV2Action,
  deleteProductAction,
  toggleProductAvailabilityAction,
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
} from "@/app/actions/products";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ProductWithVariants, ProductVariant } from "@/types";

type VariantDraft = {
  label: string;
  weightKg: string;
  priceJpy: string;
  isGiftOnly: boolean;
};

const emptyVariant: VariantDraft = {
  label: "",
  weightKg: "",
  priceJpy: "",
  isGiftOnly: false,
};

export function AdminProductsManager({
  initialProducts,
}: {
  initialProducts: ProductWithVariants[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [stockKg, setStockKg] = useState("0");
  const [description, setDescription] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [variants, setVariants] = useState<VariantDraft[]>([
    { ...emptyVariant },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [addVariantTarget, setAddVariantTarget] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState<VariantDraft>({ ...emptyVariant });
  const [addingVariant, setAddingVariant] = useState(false);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setStockKg("0");
    setDescription("");
    setIsAvailable(true);
    setVariants([{ ...emptyVariant }]);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (variants.some((v) => !v.label.trim() || !v.weightKg || !v.priceJpy))
      return;

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
      if (result.success) {
        // ページリロードでデータ取得し直し
        window.location.reload();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateProduct(productId: string) {
    setSubmitting(true);
    try {
      await updateProductV2Action(productId, {
        name,
        stockKg,
        description: description || null,
        isAvailable,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, name, stockKg, description: description || null, isAvailable }
            : p
        )
      );
      resetForm();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("この商品を削除しますか？")) return;
    const result = await deleteProductAction(productId);
    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  }

  async function handleToggleAvailability(
    productId: string,
    current: boolean
  ) {
    const result = await toggleProductAvailabilityAction(
      productId,
      !current
    );
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, isAvailable: !current } : p
        )
      );
    }
  }

  function openAddVariantModal(productId: string) {
    setAddVariantTarget(productId);
    setNewVariant({ ...emptyVariant });
  }

  function closeAddVariantModal() {
    setAddVariantTarget(null);
    setNewVariant({ ...emptyVariant });
  }

  async function handleAddVariantSubmit() {
    if (!addVariantTarget) return;
    if (!newVariant.label.trim() || !newVariant.weightKg || !newVariant.priceJpy)
      return;

    setAddingVariant(true);
    try {
      const result = await createVariantAction(addVariantTarget, {
        label: newVariant.label,
        weightKg: newVariant.weightKg,
        priceJpy: Number(newVariant.priceJpy),
        isGiftOnly: newVariant.isGiftOnly,
      });
      if (result.success) {
        window.location.reload();
      }
    } finally {
      setAddingVariant(false);
      closeAddVariantModal();
    }
  }

  async function handleDeleteVariant(
    variantId: string,
    productId: string
  ) {
    if (!confirm("このバリエーションを削除しますか？")) return;
    const result = await deleteVariantAction(variantId, productId);
    if (!result.success) {
      alert(result.error);
    } else {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                variants: p.variants.filter((v) => v.id !== variantId),
              }
            : p
        )
      );
    }
  }

  function openEditForm(product: ProductWithVariants) {
    setEditingId(product.id);
    setName(product.name);
    setStockKg(product.stockKg);
    setDescription(product.description ?? "");
    setIsAvailable(product.isAvailable);
    setShowForm(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
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
          onSubmit={(e) => {
            e.preventDefault();
            if (editingId) {
              handleUpdateProduct(editingId);
            } else {
              handleCreateProduct(e);
            }
          }}
          className="mb-6 space-y-4 rounded-lg bg-white p-4 shadow-sm"
        >
          <h2 className="font-bold text-gray-900">
            {editingId ? "商品を編集" : "新しい商品を追加"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                商品名 *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border p-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">
                在庫 (kg)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={stockKg}
                onChange={(e) => setStockKg(e.target.value)}
                className="mt-1 w-full rounded border p-2 text-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">
              説明
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded border p-2 text-gray-900"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
            />
            公開する
          </label>

          {/* バリエーション（新規作成時のみ） */}
          {!editingId && (
            <div className="border-t pt-4">
              <h3 className="mb-2 font-bold text-gray-900">バリエーション</h3>
              {variants.map((v, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <input
                    required
                    placeholder="ラベル (3kg)"
                    value={v.label}
                    onChange={(e) => {
                      const newVars = [...variants];
                      newVars[i] = { ...v, label: e.target.value };
                      setVariants(newVars);
                    }}
                    className="w-28 rounded border p-2 text-sm text-gray-900"
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
                    className="w-24 rounded border p-2 text-sm text-gray-900"
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
                    className="w-24 rounded border p-2 text-sm text-gray-900"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={v.isGiftOnly}
                      onChange={(e) => {
                        const newVars = [...variants];
                        newVars[i] = { ...v, isGiftOnly: e.target.checked };
                        setVariants(newVars);
                      }}
                    />
                    贈答用
                  </label>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setVariants(variants.filter((_, j) => j !== i))
                      }
                      className="text-sm text-red-500"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setVariants([...variants, { ...emptyVariant }])}
                className="text-sm text-orange-600 hover:underline"
              >
                + バリエーション追加
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? "保存中..." : editingId ? "更新する" : "追加する"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* 商品一覧 */}
      {products.length === 0 ? (
        <p className="text-gray-900">商品はありません</p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-lg bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-700">
                    在庫: {product.stockKg}kg / バリエーション:{" "}
                    {product.variants.length}件
                  </p>
                  {product.description && (
                    <p className="mt-1 text-sm text-gray-700">
                      {product.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    handleToggleAvailability(
                      product.id,
                      product.isAvailable
                    )
                  }
                  className={`rounded px-3 py-1 text-xs font-medium ${
                    product.isAvailable
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {product.isAvailable ? "販売中" : "非公開"}
                </button>
              </div>

              {/* バリエーション一覧（展開/折りたたみ） */}
              <div className="mt-2">
                <button
                  onClick={() =>
                    setExpandedProduct(
                      expandedProduct === product.id ? null : product.id
                    )
                  }
                  className="text-xs text-orange-600 hover:underline"
                >
                  {expandedProduct === product.id
                    ? "バリエーションを閉じる"
                    : "バリエーションを表示"}
                </button>
                {expandedProduct === product.id && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    {product.variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-900">
                          {v.label} - ¥{v.priceJpy.toLocaleString()}
                          {v.isGiftOnly && " 🎁"}
                          {!v.isAvailable && " (非公開)"}
                        </span>
                        <button
                          onClick={() =>
                            handleDeleteVariant(v.id, product.id)
                          }
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => openAddVariantModal(product.id)}
                      className="text-xs text-orange-600 hover:underline"
                    >
                      + バリエーション追加
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEditForm(product)}
                  className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* バリエーション追加モーダル */}
      <AlertDialog
        open={!!addVariantTarget}
        onOpenChange={(open) => {
          if (!open) closeAddVariantModal();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>バリエーション追加</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                ラベル *
              </label>
              <input
                placeholder="例: 3kg"
                value={newVariant.label}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, label: e.target.value })
                }
                className="mt-1 w-full rounded border p-2 text-sm text-gray-900"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  重量 (kg) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="3"
                  value={newVariant.weightKg}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, weightKg: e.target.value })
                  }
                  className="mt-1 w-full rounded border p-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  価格 (円) *
                </label>
                <input
                  type="number"
                  placeholder="1800"
                  value={newVariant.priceJpy}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, priceJpy: e.target.value })
                  }
                  className="mt-1 w-full rounded border p-2 text-sm text-gray-900"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={newVariant.isGiftOnly}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, isGiftOnly: e.target.checked })
                }
              />
              贈答用
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={addingVariant}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddVariantSubmit}
              disabled={
                addingVariant ||
                !newVariant.label.trim() ||
                !newVariant.weightKg ||
                !newVariant.priceJpy
              }
            >
              {addingVariant ? "追加中..." : "追加する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
