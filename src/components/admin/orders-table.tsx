"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { updateOrderStatusByVariantAction } from "@/app/actions/orders";
import { TIME_SLOT_LABELS, formatPickupDate } from "@/lib/constants";
import type { Order, Address, User, OrderSummaryItem } from "@/types";

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
  items: OrderSummaryItem[];
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
    const previousStatus = orders.find((o) => o.id === orderId)?.status;
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );

    const result = await updateOrderStatusByVariantAction(orderId, status);
    if (!result.success) {
      toast.error(result.error || "ステータスの更新に失敗しました");
      if (previousStatus) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: previousStatus } : o
          )
        );
      }
    }
  }

  function getStatusOptions(fulfillmentMethod: string) {
    return fulfillmentMethod === "pickup" ? pickupStatuses : deliveryStatuses;
  }

  return (
    <div>
      {/* フィルタ・ソート */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border px-4 py-3 text-lg text-gray-900"
        >
          {["all", ...allStatuses].map((s) => (
            <option key={s} value={s}>
              {statusLabels[s] ?? s}
            </option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="rounded border px-4 py-3 text-lg text-gray-900"
        >
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
        </select>
      </div>

      {/* 件数表示 */}
      <p className="mb-3 text-lg font-medium text-gray-900">
        {filteredOrders.length}件の注文
      </p>

      {/* 注文一覧 */}
      {filteredOrders.length === 0 ? (
        <p className="text-lg text-gray-900">
          {filterStatus === "all"
            ? "注文はありません"
            : `${statusLabels[filterStatus]}の注文はありません`}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="rounded-lg bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    ¥{order.totalJpy.toLocaleString()}
                  </p>
                  {order.user && (
                    <p className="text-lg text-gray-900">
                      {order.user.displayName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-2 text-base font-medium ${
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

              {/* 商品サマリー */}
              {order.items.length > 0 && (
                <div className="mt-2 space-y-1">
                  {order.items.map((item, index) => (
                    <p key={index} className="text-lg font-bold text-gray-800">
                      {item.productName} ×{item.quantity}
                    </p>
                  ))}
                </div>
              )}

              {/* 受取詳細 */}
              <div className="mt-3 text-lg text-gray-900">
                {order.fulfillmentMethod === "pickup" ? (
                  <div className="space-y-1">
                    <p>
                      受取日:{" "}
                      {order.pickupDate
                        ? formatPickupDate(order.pickupDate)
                        : "未指定"}
                    </p>
                    <p>
                      時間帯:{" "}
                      {order.pickupTimeSlot
                        ? TIME_SLOT_LABELS[order.pickupTimeSlot]
                        : "未指定"}
                    </p>
                  </div>
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
                  className="rounded border px-4 py-3 text-lg text-gray-900"
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
