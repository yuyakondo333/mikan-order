"use client";

import { useState } from "react";
import { upsertPaymentSettingsAction } from "@/app/actions/payment-settings";
import type { PaymentSettings } from "@/types";

type FormData = {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
};

function toFormData(settings: PaymentSettings | null): FormData {
  if (!settings) {
    return {
      bankName: "",
      branchName: "",
      accountType: "",
      accountNumber: "",
      accountHolder: "",
    };
  }
  return {
    bankName: settings.bankName ?? "",
    branchName: settings.branchName ?? "",
    accountType: settings.accountType ?? "",
    accountNumber: settings.accountNumber ?? "",
    accountHolder: settings.accountHolder ?? "",
  };
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "普通", label: "普通" },
  { value: "当座", label: "当座" },
];

export function PaymentSettingsEditor({
  initialData,
}: {
  initialData: PaymentSettings | null;
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

    const result = await upsertPaymentSettingsAction({
      bankName: form.bankName || null,
      branchName: form.branchName || null,
      accountType: form.accountType || null,
      accountNumber: form.accountNumber || null,
      accountHolder: form.accountHolder || null,
    });

    setSubmitting(false);

    if (result.success) {
      setMessage({ type: "success", text: "保存しました" });
    } else {
      setMessage({ type: "error", text: result.error ?? "保存に失敗しました" });
    }
  }

  function handleChange(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        お支払い設定
      </h1>
      <p className="mb-6 text-lg text-gray-600">
        配送注文時にLINEで通知する振込先情報を設定します。
      </p>

      {message && (
        <div
          className={`mb-4 rounded p-3 text-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="bankName" className="mb-1 block text-lg font-medium text-gray-900">
            銀行名
          </label>
          <input
            type="text"
            id="bankName"
            value={form.bankName}
            onChange={(e) => handleChange("bankName", e.target.value)}
            placeholder="例: みずほ銀行"
            className="w-full rounded border border-gray-300 px-3 py-3 text-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="branchName" className="mb-1 block text-lg font-medium text-gray-900">
            支店名
          </label>
          <input
            type="text"
            id="branchName"
            value={form.branchName}
            onChange={(e) => handleChange("branchName", e.target.value)}
            placeholder="例: 東京中央支店"
            className="w-full rounded border border-gray-300 px-3 py-3 text-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="accountType" className="mb-1 block text-lg font-medium text-gray-900">
            口座種別
          </label>
          <select
            id="accountType"
            value={form.accountType}
            onChange={(e) => handleChange("accountType", e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-3 text-lg focus:border-blue-500 focus:outline-none"
          >
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="accountNumber" className="mb-1 block text-lg font-medium text-gray-900">
            口座番号
          </label>
          <input
            type="text"
            id="accountNumber"
            value={form.accountNumber}
            onChange={(e) => handleChange("accountNumber", e.target.value)}
            placeholder="例: 1234567"
            className="w-full rounded border border-gray-300 px-3 py-3 text-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="accountHolder" className="mb-1 block text-lg font-medium text-gray-900">
            口座名義
          </label>
          <input
            type="text"
            id="accountHolder"
            value={form.accountHolder}
            onChange={(e) => handleChange("accountHolder", e.target.value)}
            placeholder="例: カ）ミカンノウエン"
            className="w-full rounded border border-gray-300 px-3 py-3 text-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
