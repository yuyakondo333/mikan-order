"use client";

import { useMemo, useState } from "react";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { updateOrderStatusAction } from "@/app/actions/orders";
import type { Order, Address, User } from "@/types";

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "午前中（9:00〜12:00）",
  early_afternoon: "13:00〜15:00",
  late_afternoon: "15:00〜17:00",
};

const pickupStatuses = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

const deliveryStatuses = [
  "pending",
  "awaiting_payment",
  "payment_confirmed",
  "preparing",
  "shipped",
  "completed",
  "cancelled",
] as const;

const allStatuses = [
  "pending",
  "awaiting_payment",
  "payment_confirmed",
  "preparing",
  "ready",
  "shipped",
  "completed",
  "cancelled",
] as const;

const statusLabels: Record<string, string> = {
  all: "全件",
  pending: "注文受付",
  awaiting_payment: "入金待ち",
  payment_confirmed: "入金確認済",
  preparing: "準備中",
  ready: "準備完了",
  shipped: "発送済",
  completed: "完了",
  cancelled: "キャンセル",
};

const fulfillmentLabels: Record<string, string> = {
  pickup: "取り置き",
  delivery: "お届け",
};

type SortOrder = "newest" | "oldest";

type OrderWithRelations = Order & {
  user?: User | null;
  address?: Address | null;
};

export function AdminOrdersTable({
  initialOrders,
}: {
  initialOrders: OrderWithRelations[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

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
    await updateOrderStatusAction(orderId, status);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  }

  function getStatusOptions(fulfillmentMethod: string) {
    return fulfillmentMethod === "pickup" ? pickupStatuses : deliveryStatuses;
  }

  return (
    <div>
      {/* フィルタ・ソート */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {["all", ...allStatuses].map((s) => (
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
      {filteredOrders.length === 0 ? (
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
                  {order.user && (
                    <p className="text-sm text-gray-600">
                      {order.user.displayName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.fulfillmentMethod === "pickup"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {fulfillmentLabels[order.fulfillmentMethod]}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>

              {/* 受取詳細 */}
              <div className="mt-2 text-sm text-gray-600">
                {order.fulfillmentMethod === "pickup" ? (
                  <p>
                    時間帯:{" "}
                    {order.pickupTimeSlot
                      ? TIME_SLOT_LABELS[order.pickupTimeSlot]
                      : "未指定"}
                  </p>
                ) : order.address ? (
                  <p>
                    {order.address.recipientName} - 〒
                    {order.address.postalCode}{" "}
                    {order.address.prefecture}
                    {order.address.city}
                    {order.address.line1}
                  </p>
                ) : null}
              </div>

              {/* ステータス変更 */}
              <div className="mt-3 flex justify-end">
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order.id, e.target.value)}
                  className="rounded border p-1 text-sm"
                >
                  {getStatusOptions(order.fulfillmentMethod).map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
