"use client";

import { useEffect, useMemo, useState } from "react";
import { OrderStatusBadge } from "@/components/order-status-badge";
import type { Order } from "@/types";

const statuses = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const statusLabels: Record<string, string> = {
  all: "全件",
  pending: "受付中",
  confirmed: "確認済み",
  preparing: "準備中",
  shipped: "発送済み",
  delivered: "配達完了",
  cancelled: "キャンセル",
};

type SortOrder = "newest" | "oldest";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    let result =
      filterStatus === "all"
        ? orders
        : orders.filter((o) => o.status === filterStatus);

    result = [...result].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [orders, filterStatus, sortOrder]);

  async function updateStatus(orderId: string, status: string) {
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">注文管理</h1>

      {/* フィルタ・ソート */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {["all", ...statuses].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filterStatus === s
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {statusLabels[s] ?? s}
            </button>
          ))}
        </div>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="rounded border p-1 text-sm"
        >
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
        </select>
      </div>

      {/* 件数表示 */}
      <p className="mb-3 text-sm text-gray-500">
        {filteredOrders.length}件の注文
      </p>

      {/* 注文一覧 */}
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="text-gray-500">
          {filterStatus === "all"
            ? "注文はありません"
            : `${statusLabels[filterStatus]}の注文はありません`}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                  <p className="font-bold">
                    ¥{order.totalJpy.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="rounded border p-1 text-sm"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
