import Link from "next/link";
import { OrderStatusBadge } from "@/components/order-status-badge";
import type { Order } from "@/types";

type Props = {
  orders: Order[];
};

export function OrdersList({ orders }: Props) {
  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">注文履歴</h1>
      {orders.length === 0 && (
        <p className="text-center text-gray-500">注文履歴はありません</p>
      )}
      {orders.length > 0 && (
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
