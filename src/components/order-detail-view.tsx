import Link from "next/link";
import { OrderStatusBadge } from "@/components/order-status-badge";
import type { Address } from "@/types";

type OrderItemDetail = {
  id: string;
  productId: string;
  productName: string;
  productVariety: string;
  quantity: number;
  unitPriceJpy: number;
};

type OrderDetailData = {
  id: string;
  status: string;
  paymentMethod: string;
  totalJpy: number;
  note: string | null;
  createdAt: Date | string;
  address: Address;
  items: OrderItemDetail[];
};

const paymentLabels: Record<string, string> = {
  bank_transfer: "銀行振込",
  cash_on_delivery: "代金引換",
};

export function OrderDetailView({ order }: { order: OrderDetailData }) {
  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <Link
        href="/orders"
        className="mb-4 inline-block text-sm text-orange-600 hover:underline"
      >
        ← 注文履歴に戻る
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-orange-600">注文詳細</h1>

      <div className="space-y-4">
        {/* ステータス・基本情報 */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            お支払い:{" "}
            {paymentLabels[order.paymentMethod] ?? order.paymentMethod}
          </p>
        </div>

        {/* 商品一覧 */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">注文商品</h2>
          <div className="divide-y">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {item.productName}
                  </p>
                  {item.productVariety && (
                    <p className="text-sm text-gray-500">
                      {item.productVariety}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    数量: {item.quantity}
                  </p>
                </div>
                <p className="font-medium text-orange-600">
                  ¥{(item.unitPriceJpy * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3 text-right">
            <span className="text-lg font-bold">
              合計: ¥{order.totalJpy.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 配送先 */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">配送先</h2>
          <div className="space-y-1 text-sm text-gray-700">
            <p className="font-medium">{order.address.recipientName}</p>
            <p>〒{order.address.postalCode}</p>
            <p>
              {order.address.prefecture}
              {order.address.city}
              {order.address.line1}
            </p>
            {order.address.line2 && <p>{order.address.line2}</p>}
            <p>TEL: {order.address.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
