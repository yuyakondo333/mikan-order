"use client";

import { useState } from "react";
import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { z } from "zod/v4";
import { productSchema } from "@/lib/validations";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  toggleProductAvailabilityAction,
} from "@/app/actions/products";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Product } from "@/types";

type ProductForm = {
  name: string;
  variety: string;
  weightGrams: string;
  priceJpy: string;
  description: string;
  stock: string;
  stockUnit: string;
  isAvailable: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  variety: "",
  weightGrams: "",
  priceJpy: "",
  description: "",
  stock: "0",
  stockUnit: "kg",
  isAvailable: true,
};

type FieldErrors = Partial<Record<string, string>>;

export function AdminProductsManager({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [originalStock, setOriginalStock] = useState<{
    stock: string;
    stockUnit: string;
  } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

  const deleteConfirmSchema = z.object({
    confirmName: z.string().refine(
      (val) => val === deleteTarget?.name,
      { message: "商品名が一致しません" }
    ),
  });

  const [deleteForm, deleteFields] = useForm({
    id: "delete-confirm",
    shouldValidate: "onInput",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: deleteConfirmSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      if (submission?.status === "success") {
        handleDelete();
      }
    },
  });

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setOriginalStock(null);
    setErrors({});
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    const stockStr = String(product.stock);
    const stockUnitStr = product.stockUnit;
    setForm({
      name: product.name,
      variety: product.variety,
      weightGrams: String(product.weightGrams),
      priceJpy: String(product.priceJpy),
      description: product.description ?? "",
      stock: stockStr,
      stockUnit: stockUnitStr,
      isAvailable: product.isAvailable,
    });
    setOriginalStock({ stock: stockStr, stockUnit: stockUnitStr });
    setErrors({});
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setOriginalStock(null);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = productSchema.safeParse({
      name: form.name,
      variety: form.variety,
      weightGrams: Number(form.weightGrams),
      priceJpy: Number(form.priceJpy),
      description: form.description || undefined,
      stock: Number(form.stock),
      stockUnit: form.stockUnit,
      isAvailable: form.isAvailable,
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    type ProductPayload = Partial<{
      name: string;
      variety: string;
      weightGrams: number;
      priceJpy: number;
      description: string | null;
      stock: number;
      stockUnit: string;
      isAvailable: boolean;
    }>;
    const payload: ProductPayload = {
      ...parsed.data,
      description: parsed.data.description || null,
    };

    // 編集時: stock/stockUnit が変更されていなければ payload から除外
    // （注文による在庫減算を上書きしないため）
    if (editingId && originalStock) {
      if (form.stock === originalStock.stock) {
        delete payload.stock;
      }
      if (form.stockUnit === originalStock.stockUnit) {
        delete payload.stockUnit;
      }
    }

    try {
      if (editingId) {
        const result = await updateProductAction(editingId, payload);
        if (result.success) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === editingId ? { ...p, ...payload } : p
            )
          );
          cancelForm();
        }
      } else {
        const result = await createProductAction(payload as Parameters<typeof createProductAction>[0]);
        if (result.success && result.product) {
          setProducts((prev) => [...prev, result.product!]);
          cancelForm();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeleteStep(1);
    deleteForm.reset();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteProductAction(deleteTarget.id);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      }
    } finally {
      setDeleting(false);
      closeDeleteDialog();
    }
  }

  async function toggleAvailability(id: string, isAvailable: boolean) {
    const result = await toggleProductAvailabilityAction(id, !isAvailable);
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, isAvailable: !isAvailable } : p
        )
      );
    }
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
          onSubmit={handleSubmit}
          className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow-sm"
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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`mt-1 w-full rounded border p-2 text-gray-900 ${errors.name ? "border-red-500" : ""}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">
                品種 *
              </label>
              <input
                required
                value={form.variety}
                onChange={(e) => setForm({ ...form, variety: e.target.value })}
                className={`mt-1 w-full rounded border p-2 text-gray-900 ${errors.variety ? "border-red-500" : ""}`}
              />
              {errors.variety && (
                <p className="mt-1 text-sm text-red-600">{errors.variety}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">
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
                className={`mt-1 w-full rounded border p-2 text-gray-900 ${errors.weightGrams ? "border-red-500" : ""}`}
              />
              {errors.weightGrams && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.weightGrams}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">
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
                className={`mt-1 w-full rounded border p-2 text-gray-900 ${errors.priceJpy ? "border-red-500" : ""}`}
              />
              {errors.priceJpy && (
                <p className="mt-1 text-sm text-red-600">{errors.priceJpy}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">
                在庫数 *
              </label>
              <input
                required
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: e.target.value })
                }
                className={`mt-1 w-full rounded border p-2 text-gray-900 ${errors.stock ? "border-red-500" : ""}`}
              />
              {errors.stock && (
                <p className="mt-1 text-sm text-red-600">{errors.stock}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900">
                在庫単位 *
              </label>
              <select
                value={form.stockUnit}
                onChange={(e) =>
                  setForm({ ...form, stockUnit: e.target.value })
                }
                className={`mt-1 w-full rounded border p-2 text-gray-900 ${errors.stockUnit ? "border-red-500" : ""}`}
              >
                <option value="kg">kg</option>
                <option value="箱">箱</option>
                <option value="個">個</option>
              </select>
              {errors.stockUnit && (
                <p className="mt-1 text-sm text-red-600">{errors.stockUnit}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">
              説明
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="mt-1 w-full rounded border p-2 text-gray-900"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-900">
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
                  <p className="text-sm text-gray-900">
                    {product.variety} / {product.weightGrams}g /
                    ¥{product.priceJpy.toLocaleString()} / 在庫: {product.stock}{product.stockUnit}
                  </p>
                  {product.description && (
                    <p className="mt-1 text-sm text-gray-900">
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
                      : "bg-gray-100 text-gray-900"
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
                  onClick={() =>
                    setDeleteTarget({ id: product.id, name: product.name })
                  }
                  className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 削除確認モーダル（1段目） */}
      <AlertDialog
        open={!!deleteTarget && deleteStep === 1}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品を削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}」を削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => setDeleteStep(2)}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 削除確認モーダル（2段目・商品名入力による最終確認） */}
      <AlertDialog
        open={!!deleteTarget && deleteStep === 2}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>最終確認</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。確認のため、商品名「
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              」を入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form {...getFormProps(deleteForm)}>
            <input
              {...getInputProps(deleteFields.confirmName, { type: "text" })}
              placeholder={deleteTarget?.name}
              className="w-full rounded border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            {deleteFields.confirmName.errors && (
              <p className="mt-1 text-xs text-red-600">
                {deleteFields.confirmName.errors[0]}
              </p>
            )}
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={deleting}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                variant="destructive"
                disabled={deleting || !deleteFields.confirmName.valid}
              >
                {deleting ? "削除中..." : "完全に削除する"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
