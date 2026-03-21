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
import {
  type VariantDraft,
  type VariantEdit,
  emptyVariant,
  getVariantEdit as getVariantEditPure,
  isVariantDirty as isVariantDirtyPure,
  getDirtyVariants as getDirtyVariantsPure,
  buildProductsAfterVariantSave,
} from "./products-manager.utils";

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
  const [variantEdits, setVariantEdits] = useState<Record<string, VariantEdit>>({});
  const [savingVariants, setSavingVariants] = useState(false);
  const [deleteProductTarget, setDeleteProductTarget] = useState<string | null>(null);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<{ variantId: string; productId: string } | null>(null);

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
      if (result.success && result.product) {
        const newProduct: ProductWithVariants = {
          ...result.product,
          stockKg: Number(stockKg),
          imageUrl: null,
          isAvailable,
          description: description || null,
          variants: result.variants ?? [],
        };
        setProducts((prev) => [...prev, newProduct]);
        resetForm();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateProduct(productId: string) {
    setSubmitting(true);
    try {
      const stockKgNum = Number(stockKg);
      await updateProductV2Action(productId, {
        name,
        stockKg: stockKgNum,
        description: description || null,
        isAvailable,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, name, stockKg: stockKgNum, description: description || null, isAvailable }
            : p
        )
      );
      resetForm();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    const result = await deleteProductAction(productId);
    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
    setDeleteProductTarget(null);
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
      if (result.success && result.variant) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === addVariantTarget
              ? { ...p, variants: [...p.variants, result.variant!] }
              : p
          )
        );
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
    setDeleteVariantTarget(null);
  }

  function getVariantEdit(v: ProductVariant) {
    return getVariantEditPure(v, variantEdits);
  }

  function updateVariantField(variantId: string, original: ProductVariant, field: string, value: string | boolean) {
    setVariantEdits((prev) => ({
      ...prev,
      [variantId]: {
        ...getVariantEditPure(original, prev),
        [field]: value,
      },
    }));
  }

  function isVariantDirty(v: ProductVariant): boolean {
    return isVariantDirtyPure(v, variantEdits);
  }

  function getDirtyVariants(productId: string): ProductVariant[] {
    return getDirtyVariantsPure(products, productId, variantEdits);
  }

  function resetVariantEdits(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setVariantEdits((prev) => {
      const next = { ...prev };
      for (const v of product.variants) {
        delete next[v.id];
      }
      return next;
    });
  }

  async function handleSaveAllVariants(productId: string) {
    const dirty = getDirtyVariants(productId);
    if (dirty.length === 0) return;

    setSavingVariants(true);
    try {
      const settled = await Promise.allSettled(
        dirty.map((v) => {
          const edit = variantEdits[v.id]!;
          return updateVariantAction(v.id, {
            label: edit.label,
            weightKg: v.weightKg,
            priceJpy: Number(edit.priceJpy),
            isGiftOnly: edit.isGiftOnly,
            isAvailable: edit.isAvailable,
          });
        })
      );

      const results = dirty.map((v, i) => ({
        variantId: v.id,
        edit: variantEdits[v.id]!,
        success: settled[i].status === "fulfilled" && (settled[i] as PromiseFulfilledResult<{ success: boolean }>).value.success,
      }));

      setProducts((prev) => buildProductsAfterVariantSave(prev, productId, results));

      // 成功分のeditsをクリア、失敗分はeditsに残す
      setVariantEdits((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.success) delete next[r.variantId];
        }
        return next;
      });
    } finally {
      setSavingVariants(false);
    }
  }

  function openEditForm(product: ProductWithVariants) {
    setEditingId(product.id);
    setName(product.name);
    setStockKg(String(product.stockKg));
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
          className="cursor-pointer rounded bg-orange-500 px-5 py-2.5 text-base font-medium text-white hover:bg-orange-600"
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
          className="mb-6 space-y-4 rounded-lg bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-gray-900">
            {editingId ? "商品を編集" : "新しい商品を追加"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-base font-medium text-gray-900">
                商品名 *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border p-2.5 text-base text-gray-900"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-900">
                在庫 (kg)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={stockKg}
                onChange={(e) => setStockKg(e.target.value)}
                className="mt-1 w-full rounded border p-2.5 text-base text-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-base font-medium text-gray-900">
              説明
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded border p-2.5 text-base text-gray-900"
            />
          </div>
          <label className="flex items-center gap-2 text-base text-gray-900">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-5 w-5"
            />
            公開する
          </label>

          {/* バリエーション（新規作成時のみ） */}
          {!editingId && (
            <div className="border-t pt-4">
              <h3 className="mb-2 font-bold text-gray-900">バリエーション</h3>
              {variants.map((v, i) => (
                <div key={i} className="mb-3 flex items-center gap-3">
                  <input
                    required
                    placeholder="ラベル (3kg)"
                    value={v.label}
                    onChange={(e) => {
                      const newVars = [...variants];
                      newVars[i] = { ...v, label: e.target.value };
                      setVariants(newVars);
                    }}
                    className="w-36 rounded border p-2.5 text-base text-gray-900"
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
                    className="w-32 rounded border p-2.5 text-base text-gray-900"
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
                    className="w-32 rounded border p-2.5 text-base text-gray-900"
                  />
                  <label className="flex items-center gap-2 text-base text-gray-700">
                    <input
                      type="checkbox"
                      checked={v.isGiftOnly}
                      onChange={(e) => {
                        const newVars = [...variants];
                        newVars[i] = { ...v, isGiftOnly: e.target.checked };
                        setVariants(newVars);
                      }}
                      className="h-5 w-5"
                    />
                    贈答用
                  </label>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setVariants(variants.filter((_, j) => j !== i))
                      }
                      className="cursor-pointer text-base text-red-600"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setVariants([...variants, { ...emptyVariant }])}
                className="cursor-pointer text-base text-orange-600 hover:underline"
              >
                + バリエーション追加
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded bg-orange-500 px-5 py-2.5 text-base font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? "保存中..." : editingId ? "更新する" : "追加する"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="cursor-pointer rounded bg-gray-200 px-5 py-2.5 text-base font-medium text-gray-900 hover:bg-gray-300"
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
              className="rounded-lg bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
                <button
                  onClick={() =>
                    handleToggleAvailability(
                      product.id,
                      product.isAvailable
                    )
                  }
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-bold ${
                    product.isAvailable
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {product.isAvailable ? "販売中" : "非公開"}
                </button>
                <span className="text-base font-bold text-gray-700">
                  在庫{" "}
                  {product.stockKg === 0 ? (
                    <span className="font-medium text-red-600">売り切れ</span>
                  ) : (
                    <span className={`font-medium ${product.stockKg <= 5 ? "text-red-600" : "text-gray-900"}`}>
                      {product.stockKg}kg
                    </span>
                  )}
                </span>
                <span className="text-base font-bold text-gray-700">
                  バリエーション <span className="text-gray-900">{product.variants.length}件</span>
                </span>
              </div>
              {product.description && (
                <p className="mt-3 text-base leading-relaxed text-gray-700">
                  {product.description}
                </p>
              )}

              {/* バリエーション一覧（展開/折りたたみ） */}
              <div className="mt-2">
                <button
                  onClick={() =>
                    setExpandedProduct(
                      expandedProduct === product.id ? null : product.id
                    )
                  }
                  className="cursor-pointer text-sm text-orange-600 hover:underline"
                >
                  {expandedProduct === product.id
                    ? "バリエーションを閉じる"
                    : "バリエーションを表示"}
                </button>
                {expandedProduct === product.id && (
                  <div className="mt-2 border-t pt-3">
                    {/* Shopify風 Saveバー */}
                    {getDirtyVariants(product.id).length > 0 && (
                      <div className="mb-3 flex items-center justify-between rounded-lg bg-orange-50 px-4 py-3">
                        <span className="text-base font-medium text-orange-800">
                          未保存の変更があります
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => resetVariantEdits(product.id)}
                            className="cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            元に戻す
                          </button>
                          <button
                            onClick={() => handleSaveAllVariants(product.id)}
                            disabled={savingVariants}
                            className="cursor-pointer rounded bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                          >
                            {savingVariants ? "保存中..." : "保存"}
                          </button>
                        </div>
                      </div>
                    )}
                    <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 text-base">
                      <thead>
                        <tr className="bg-gray-100 text-left text-base font-semibold text-gray-800">
                          <th className="px-4 py-3">ラベル</th>
                          <th className="px-4 py-3">価格</th>
                          <th className="px-4 py-3">区分</th>
                          <th className="px-4 py-3">状態</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {product.variants.map((v) => {
                          const edit = getVariantEdit(v);
                          const labelDirty = edit.label !== v.label;
                          const priceDirty = edit.priceJpy !== String(v.priceJpy);
                          const giftDirty = edit.isGiftOnly !== v.isGiftOnly;
                          const availDirty = edit.isAvailable !== v.isAvailable;
                          return (
                            <tr key={v.id} className="border-t border-gray-200">
                              <td className="px-4 py-3">
                                <input
                                  value={edit.label}
                                  onChange={(e) => updateVariantField(v.id, v, "label", e.target.value)}
                                  className={`w-full rounded border bg-transparent px-3 py-2 text-base text-gray-900 focus:bg-white focus:outline-none ${labelDirty ? "border-orange-400 bg-orange-50" : "border-gray-200 focus:border-orange-400"}`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-base text-gray-700">¥</span>
                                  <input
                                    type="number"
                                    value={edit.priceJpy}
                                    onChange={(e) => updateVariantField(v.id, v, "priceJpy", e.target.value)}
                                    className={`w-full rounded border bg-transparent px-3 py-2 text-base text-gray-900 focus:bg-white focus:outline-none ${priceDirty ? "border-orange-400 bg-orange-50" : "border-gray-200 focus:border-orange-400"}`}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <label className={`flex items-center gap-2 rounded px-2 py-1 text-base text-gray-800 ${giftDirty ? "bg-orange-50 ring-1 ring-orange-400" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={edit.isGiftOnly}
                                    onChange={(e) => updateVariantField(v.id, v, "isGiftOnly", e.target.checked)}
                                    className="h-5 w-5 accent-gray-700"
                                  />
                                  贈答用
                                </label>
                              </td>
                              <td className="px-4 py-3">
                                <label className={`flex items-center gap-2 rounded px-2 py-1 text-base text-gray-800 ${availDirty ? "bg-orange-50 ring-1 ring-orange-400" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={edit.isAvailable}
                                    onChange={(e) => updateVariantField(v.id, v, "isAvailable", e.target.checked)}
                                    className="h-5 w-5 accent-gray-700"
                                  />
                                  公開
                                </label>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setDeleteVariantTarget({ variantId: v.id, productId: product.id })}
                                  className="cursor-pointer rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-all duration-200 hover:border-red-500 hover:bg-red-600 hover:text-white"
                                >
                                  削除
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <button
                      onClick={() => openAddVariantModal(product.id)}
                      className="mt-3 cursor-pointer text-sm font-medium text-orange-600 hover:underline"
                    >
                      + バリエーション追加
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => openEditForm(product)}
                  className="cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  編集
                </button>
                <button
                  onClick={() => setDeleteProductTarget(product.id)}
                  className="cursor-pointer rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-all duration-200 hover:border-red-500 hover:bg-red-600 hover:text-white"
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
          <div className="space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-900">
                ラベル *
              </label>
              <input
                placeholder="例: 3kg"
                value={newVariant.label}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, label: e.target.value })
                }
                className="mt-1 w-full rounded border p-2.5 text-base text-gray-900"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-base font-medium text-gray-900">
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
                  className="mt-1 w-full rounded border p-2.5 text-base text-gray-900"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-900">
                  価格 (円) *
                </label>
                <input
                  type="number"
                  placeholder="1800"
                  value={newVariant.priceJpy}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, priceJpy: e.target.value })
                  }
                  className="mt-1 w-full rounded border p-2.5 text-base text-gray-900"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-base text-gray-900">
              <input
                type="checkbox"
                checked={newVariant.isGiftOnly}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, isGiftOnly: e.target.checked })
                }
                className="h-5 w-5"
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

      {/* 商品削除確認ダイアログ */}
      <AlertDialog
        open={!!deleteProductTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteProductTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-base text-gray-700">
            この操作は取り消せません。商品に紐づくバリエーションもすべて削除されます。
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductTarget && handleDeleteProduct(deleteProductTarget)}
              className="bg-red-600 hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* バリエーション削除確認ダイアログ */}
      <AlertDialog
        open={!!deleteVariantTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteVariantTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>バリエーションを削除しますか？</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-base text-gray-700">
            この操作は取り消せません。
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteVariantTarget &&
                handleDeleteVariant(deleteVariantTarget.variantId, deleteVariantTarget.productId)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
