"use client";

import { useState } from "react";
import { upsertLegalInfoAction } from "@/app/actions/legal-info";
import type { LegalInfo } from "@/types";

type FormData = {
  sellerName: string;
  representative: string;
  address: string;
  phone: string;
  email: string;
  priceInfo: string;
  shippingFee: string;
  additionalCost: string;
  paymentMethod: string;
  paymentDeadline: string;
  deliveryTime: string;
  returnPolicy: string;
  note: string;
};

const fields: {
  key: keyof FormData;
  label: string;
  required: boolean;
  multiline?: boolean;
  inputType?: string;
}[] = [
  { key: "sellerName", label: "販売業者", required: true },
  { key: "representative", label: "代表者", required: true },
  { key: "address", label: "所在地", required: true, multiline: true },
  { key: "phone", label: "電話番号", required: true },
  { key: "email", label: "メールアドレス", required: false, inputType: "email" },
  { key: "priceInfo", label: "販売価格", required: true },
  { key: "shippingFee", label: "送料", required: true },
  { key: "additionalCost", label: "商品代金以外の必要料金", required: true },
  { key: "paymentMethod", label: "お支払い方法", required: true },
  { key: "paymentDeadline", label: "お支払い期限", required: true },
  { key: "deliveryTime", label: "商品の引渡し時期", required: true },
  { key: "returnPolicy", label: "返品・交換について", required: true, multiline: true },
  { key: "note", label: "備考", required: false, multiline: true },
];

function toFormData(info: LegalInfo | null): FormData {
  if (!info) {
    return {
      sellerName: "",
      representative: "",
      address: "",
      phone: "",
      email: "",
      priceInfo: "",
      shippingFee: "",
      additionalCost: "",
      paymentMethod: "",
      paymentDeadline: "",
      deliveryTime: "",
      returnPolicy: "",
      note: "",
    };
  }
  return {
    sellerName: info.sellerName,
    representative: info.representative,
    address: info.address,
    phone: info.phone,
    email: info.email ?? "",
    priceInfo: info.priceInfo,
    shippingFee: info.shippingFee,
    additionalCost: info.additionalCost,
    paymentMethod: info.paymentMethod,
    paymentDeadline: info.paymentDeadline,
    deliveryTime: info.deliveryTime,
    returnPolicy: info.returnPolicy,
    note: info.note ?? "",
  };
}

export function LegalInfoEditor({
  initialData,
}: {
  initialData: LegalInfo | null;
}) {
  const [form, setForm] = useState<FormData>(() => toFormData(initialData));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const result = await upsertLegalInfoAction({
      ...form,
      email: form.email || null,
      note: form.note || null,
    });

    setSubmitting(false);

    if (result.success) {
      setMessage({ type: "success", text: "保存しました" });
    } else {
      setMessage({ type: "error", text: result.error ?? "保存に失敗しました" });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        特定商取引法に基づく表記
      </h1>

      {message && (
        <div
          className={`mb-4 rounded p-3 text-base ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={field.key}
              className="mb-1 block text-base font-medium text-gray-800"
            >
              {field.label}
              {field.required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </label>
            {field.multiline ? (
              <textarea
                id={field.key}
                value={form[field.key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none"
                required={field.required}
              />
            ) : (
              <input
                type={field.inputType ?? "text"}
                id={field.key}
                value={form[field.key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none"
                required={field.required}
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded bg-blue-600 px-6 py-2.5 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
