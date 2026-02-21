"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { OrderStatusBadge } from "@/components/order-status-badge";
import type { Order } from "@/types";

export default function OrdersPage() {
  const { profile } = useLiff();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/orders?userId=${profile.userId}`)
      .then((res) => res.json())
      .then(setOrders);
  }, [profile]);

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">注文履歴</h1>
      {orders.length === 0 ? (
        <p className="text-center text-gray-500">注文履歴はありません</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-2 text-lg font-bold">
                ¥{order.totalJpy.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
