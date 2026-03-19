"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { TIME_SLOT_LABELS, formatPickupDate } from "@/lib/constants";
import type { CartItemType } from "@/types";

type PickupData = {
  fulfillmentMethod: "pickup";
  pickupDate: string;
  pickupTimeSlot: string;
};

type DeliveryData = {
  fulfillmentMethod: "delivery";
  address: {
    recipientName: string;
    postalCode: string;
    prefecture: string;
    city: string;
    line1: string;
    line2?: string;
  };
};

type FulfillmentData = PickupData | DeliveryData;

export function ConfirmContent() {
  const router = useRouter();
  const { profile } = useLiff();
  const [cart, setCart] = useState<CartItemType[]>([]);
  const [fulfillment, setFulfillment] = useState<FulfillmentData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const storedCart = JSON.parse(localStorage.getItem("cart") ?? "[]");
      const storedFulfillment = sessionStorage.getItem("orderFulfillment");

      if (!Array.isArray(storedCart) || storedCart.length === 0 || !storedFulfillment) {
        router.replace("/cart");
        return;
      }

      setCart(storedCart);
      setFulfillment(JSON.parse(storedFulfillment));
    } catch {
      router.replace("/cart");
    }
  }, [router]);

  const total = cart.reduce(
    (sum, item) => sum + item.priceJpy * item.quantity,
    0
  );

  async function handleSubmit() {
    if (!profile || !fulfillment) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          order: fulfillment,
          items: cart.map((item) => ({
            id: item.id,
            priceJpy: item.priceJpy,
            quantity: item.quantity,
          })),
        }),
      });

      if (res.ok) {
        localStorage.removeItem("cart");
        sessionStorage.removeItem("orderFulfillment");
        window.dispatchEvent(new Event("cart-updated"));
        const method = fulfillment.fulfillmentMethod;
        router.push(`/complete?method=${method}`);
      } else {
        alert("注文に失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!fulfillment) return null;

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">注文内容の確認</h1>

      <div className="space-y-4">
        {/* 注文商品 */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">注文商品</h2>
          <div className="divide-y">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">数量: {item.quantity}</p>
                </div>
                <p className="font-medium text-orange-600">
                  ¥{(item.priceJpy * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3 text-right">
            <span className="text-lg font-bold">
              合計: ¥{total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 受取方法 */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">受取方法</h2>
          {fulfillment.fulfillmentMethod === "pickup" ? (
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-medium">取り置き</p>
              <p>
                受取日: {formatPickupDate(fulfillment.pickupDate)}
              </p>
              <p>
                時間帯: {TIME_SLOT_LABELS[fulfillment.pickupTimeSlot]}
              </p>
              <p>お支払い: 受け取り時に現金でお支払い</p>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-medium">お届け</p>
              <p>{fulfillment.address.recipientName}</p>
              <p>〒{fulfillment.address.postalCode}</p>
              <p>
                {fulfillment.address.prefecture}
                {fulfillment.address.city}
                {fulfillment.address.line1}
              </p>
              {fulfillment.address.line2 && <p>{fulfillment.address.line2}</p>}
              <p>お支払い: 銀行振込</p>
            </div>
          )}
        </div>
      </div>

      {/* ボタン */}
      <div className="mt-6 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-full bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting ? "送信中..." : "注文を確定する"}
        </button>
        <button
          onClick={() => router.back()}
          disabled={submitting}
          className="w-full rounded-full border border-gray-300 bg-white py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          戻る
        </button>
      </div>
    </div>
  );
}
