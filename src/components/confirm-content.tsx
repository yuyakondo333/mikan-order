"use client";

import { useEffect, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TIME_SLOT_LABELS, formatPickupDate } from "@/lib/constants";
import { createOrderByVariant } from "@/app/actions/orders";
import type { CartItemWithVariant } from "@/types";

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

function getFulfillmentFromStorage(): FulfillmentData | null {
  try {
    const stored = sessionStorage.getItem("orderFulfillment");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function subscribe() {
  return () => {};
}

export function ConfirmContent({ items }: { items: CartItemWithVariant[] }) {
  const router = useRouter();
  const fulfillment = useSyncExternalStore(
    subscribe,
    getFulfillmentFromStorage,
    () => null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!fulfillment) {
      router.replace("/cart");
    }
  }, [fulfillment, router]);

  const total = items.reduce(
    (sum, item) => sum + item.priceJpy * item.quantity,
    0
  );

  function handleSubmit() {
    if (!fulfillment) return;

    startTransition(async () => {
      const result = await createOrderByVariant(fulfillment);

      if (result.success) {
        sessionStorage.removeItem("orderFulfillment");
        router.push(`/complete?method=${result.fulfillmentMethod}`);
      } else {
        alert(result.error || "注文に失敗しました");
      }
    });
  }

  if (!fulfillment) return null;

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">注文内容の確認</h1>

      <div className="space-y-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">注文商品</h2>
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {item.productName}
                  </p>
                  <p className="text-sm text-gray-500">{item.label}</p>
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

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">受取方法</h2>
          {fulfillment.fulfillmentMethod === "pickup" ? (
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-medium">取り置き</p>
              <p>受取日: {formatPickupDate(fulfillment.pickupDate)}</p>
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

      <div className="mt-6 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full cursor-pointer rounded-full bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isPending ? "送信中..." : "注文を確定する"}
        </button>
        <button
          onClick={() => router.back()}
          disabled={isPending}
          className="w-full cursor-pointer rounded-full border border-gray-300 bg-white py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          戻る
        </button>
      </div>
    </div>
  );
}
