"use client";

import { useState } from "react";
import {
  toggleProductAvailabilityAction,
  deleteProductAction,
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
  buildProductsAfterVariantSave,
} from "./products-manager.utils";

type Props = {
  product: ProductWithVariants;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onProductChange: (updated: ProductWithVariants) => void;
  onProductDelete: (productId: string) => void;
};

export function ProductCard({
  product,
  expanded,
  onToggleExpand,
  onEdit,
  onProductChange,
  onProductDelete,
}: Props) {
  const [addVariantTarget, setAddVariantTarget] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState<VariantDraft>({ ...emptyVariant });
  const [addingVariant, setAddingVariant] = useState(false);
  const [variantEdits, setVariantEdits] = useState<Record<string, VariantEdit>>({});
  const [savingVariants, setSavingVariants] = useState(false);
  const [deleteProductTarget, setDeleteProductTarget] = useState(false);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<{ variantId: string } | null>(null);

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

  function getDirtyVariants(): ProductVariant[] {
    return product.variants.filter((v) => {
      const edit = variantEdits[v.id];
      if (!edit) return false;
      return (
        edit.label !== v.label ||
        edit.priceJpy !== String(v.priceJpy) ||
        edit.isGiftOnly !== v.isGiftOnly ||
        edit.isAvailable !== v.isAvailable
      );
    });
  }

  function resetVariantEdits() {
    setVariantEdits((prev) => {
      const next = { ...prev };
      for (const v of product.variants) {
        delete next[v.id];
      }
      return next;
    });
  }

  async function handleToggleAvailability() {
    const result = await toggleProductAvailabilityAction(
      product.id,
      !product.isAvailable
    );
    if (result.success) {
      onProductChange({ ...product, isAvailable: !product.isAvailable });
    }
  }

  async function handleDeleteProduct() {
    const result = await deleteProductAction(product.id);
    if (result.success) {
      onProductDelete(product.id);
    }
    setDeleteProductTarget(false);
  }

  function openAddVariantModal() {
    setAddVariantTarget(product.id);
    setNewVariant({ ...emptyVariant });
  }

  function closeAddVariantModal() {
    setAddVariantTarget(null);
    setNewVariant({ ...emptyVariant });
  }

  async function handleAddVariantSubmit() {
    if (!addVariantTarget) return;
    if (!newVariant.label.trim() || !newVariant.weightKg || !newVariant.priceJpy) return;

    setAddingVariant(true);
    try {
      const result = await createVariantAction(product.id, {
        label: newVariant.label,
        weightKg: newVariant.weightKg,
        priceJpy: Number(newVariant.priceJpy),
        isGiftOnly: newVariant.isGiftOnly,
      });
      if (result.success && result.variant) {
        onProductChange({
          ...product,
          variants: [...product.variants, result.variant],
        });
      }
    } finally {
      setAddingVariant(false);
      closeAddVariantModal();
    }
  }

  async function handleDeleteVariant(variantId: string) {
    const result = await deleteVariantAction(variantId, product.id);
    if (!result.success) {
      alert(result.error);
    } else {
      onProductChange({
        ...product,
        variants: product.variants.filter((v) => v.id !== variantId),
      });
    }
    setDeleteVariantTarget(null);
  }

  async function handleSaveAllVariants() {
    const dirty = getDirtyVariants();
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

      const updated = buildProductsAfterVariantSave([product], product.id, results);
      onProductChange(updated[0]);

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

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
        <button
          onClick={handleToggleAvailability}
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
          onClick={onToggleExpand}
          className="cursor-pointer text-sm text-orange-600 hover:underline"
        >
          {expanded ? "バリエーションを閉じる" : "バリエーションを表示"}
        </button>
        {expanded && (
          <div className="mt-2 border-t pt-3">
            {/* Shopify風 Saveバー */}
            {getDirtyVariants().length > 0 && (
              <div className="mb-3 flex items-center justify-between rounded-lg bg-orange-50 px-4 py-3">
                <span className="text-base font-medium text-orange-800">
                  未保存の変更があります
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={resetVariantEdits}
                    className="cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    元に戻す
                  </button>
                  <button
                    onClick={handleSaveAllVariants}
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
                          onClick={() => setDeleteVariantTarget({ variantId: v.id })}
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
              onClick={openAddVariantModal}
              className="mt-3 cursor-pointer text-sm font-medium text-orange-600 hover:underline"
            >
              + バリエーション追加
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={onEdit}
          className="cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          編集
        </button>
        <button
          onClick={() => setDeleteProductTarget(true)}
          className="cursor-pointer rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-all duration-200 hover:border-red-500 hover:bg-red-600 hover:text-white"
        >
          削除
        </button>
      </div>

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
                onChange={(e) => setNewVariant({ ...newVariant, label: e.target.value })}
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
                  onChange={(e) => setNewVariant({ ...newVariant, weightKg: e.target.value })}
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
                  onChange={(e) => setNewVariant({ ...newVariant, priceJpy: e.target.value })}
                  className="mt-1 w-full rounded border p-2.5 text-base text-gray-900"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-base text-gray-900">
              <input
                type="checkbox"
                checked={newVariant.isGiftOnly}
                onChange={(e) => setNewVariant({ ...newVariant, isGiftOnly: e.target.checked })}
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
        open={deleteProductTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteProductTarget(false);
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
              onClick={handleDeleteProduct}
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
                deleteVariantTarget && handleDeleteVariant(deleteVariantTarget.variantId)
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
