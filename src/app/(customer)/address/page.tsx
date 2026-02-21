"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";

export default function AddressPage() {
  const router = useRouter();
  const { profile } = useLiff();
  const [form, setForm] = useState({
    postalCode: "",
    prefecture: "",
    city: "",
    line1: "",
    line2: "",
    phone: "",
    recipientName: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<
    "bank_transfer" | "cash_on_delivery"
  >("cash_on_delivery");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    try {
      const cart = JSON.parse(localStorage.getItem("cart") ?? "[]");
      if (cart.length === 0) {
        alert("カートが空です");
        return;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          address: form,
          paymentMethod,
          items: cart,
        }),
      });

      if (res.ok) {
        localStorage.removeItem("cart");
        router.push("/orders");
      } else {
        alert("注文に失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">
        配送先・お支払い
      </h1>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg bg-white p-4 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            受取人名
          </label>
          <input
            name="recipientName"
            value={form.recipientName}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            郵便番号
          </label>
          <input
            name="postalCode"
            value={form.postalCode}
            onChange={handleChange}
            required
            placeholder="123-4567"
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            都道府県
          </label>
          <input
            name="prefecture"
            value={form.prefecture}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            市区町村
          </label>
          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            番地・建物名
          </label>
          <input
            name="line1"
            value={form.line1}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            建物名・部屋番号（任意）
          </label>
          <input
            name="line2"
            value={form.line2}
            onChange={handleChange}
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            電話番号
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="090-1234-5678"
            className="mt-1 w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            お支払い方法
          </label>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentMethod"
                value="cash_on_delivery"
                checked={paymentMethod === "cash_on_delivery"}
                onChange={() => setPaymentMethod("cash_on_delivery")}
              />
              代金引換
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={paymentMethod === "bank_transfer"}
                onChange={() => setPaymentMethod("bank_transfer")}
              />
              銀行振込
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting ? "送信中..." : "注文を確定する"}
        </button>
      </form>
    </div>
  );
}
