"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiff } from "@/components/liff-provider";
import { OrderStatusBadge } from "@/components/order-status-badge";
import type { Order } from "@/types";

export default function OrdersPage() {
  const { profile } = useLiff();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/orders?userId=${profile.userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("注文履歴の取得に失敗しました");
        return res.json();
      })
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [profile]);

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">注文履歴</h1>
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-300 border-t-orange-600" />
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm underline"
          >
            再読み込み
          </button>
        </div>
      )}
      {!loading && !error && orders.length === 0 && (
        <p className="text-center text-gray-500">注文履歴はありません</p>
      )}
      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-bold">
                  ¥{order.totalJpy.toLocaleString()}
                </p>
                <span className="text-sm text-orange-600">詳細 →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
