import Link from "next/link";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { TIME_SLOT_LABELS, formatPickupDate } from "@/lib/constants";
import { hasBankTransferInfo } from "@/lib/payment";
import type { Address, BankTransferInfo } from "@/types";

type OrderItemDetail = {
  id: string;
  productId: string;
  productName: string;
  productVariety?: string;
  label?: string | null;
  quantity: number;
  unitPriceJpy: number;
};

type OrderDetailData = {
  id: string;
  status: string;
  fulfillmentMethod: string;
  pickupDate: string | null;
  pickupTimeSlot: string | null;
  totalJpy: number;
  note: string | null;
  createdAt: Date | string;
  address: Address | null;
  items: OrderItemDetail[];
};

type Props = {
  order: OrderDetailData;
  bankTransferInfo?: BankTransferInfo | null;
};

export function OrderDetailView({ order, bankTransferInfo }: Props) {
  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <Link
        href="/orders"
        className="mb-4 inline-block text-sm text-orange-600 hover:underline"
      >
        &larr; 注文履歴に戻る
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
                  {(item.label || item.productVariety) && (
                    <p className="text-sm text-gray-500">
                      {item.label || item.productVariety}
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

        {/* 受取方法 */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">受取方法</h2>
          {order.fulfillmentMethod === "pickup" ? (
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-medium">取り置き</p>
              <p>
                受取日:{" "}
                {order.pickupDate
                  ? formatPickupDate(order.pickupDate)
                  : "未指定"}
              </p>
              <p>
                時間帯:{" "}
                {order.pickupTimeSlot
                  ? TIME_SLOT_LABELS[order.pickupTimeSlot] ?? order.pickupTimeSlot
                  : "未指定"}
              </p>
              <p>お支払い: 店頭でお支払い</p>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-medium">お届け</p>
              {order.address && (
                <>
                  <p>{order.address.recipientName}</p>
                  <p>〒{order.address.postalCode}</p>
                  <p>
                    {order.address.prefecture}
                    {order.address.city}
                    {order.address.line1}
                  </p>
                  {order.address.line2 && <p>{order.address.line2}</p>}
                </>
              )}
              <p>お支払い: 銀行振込（事前入金）</p>
              {order.status === "awaiting_payment" && (
                <div className="mt-3 rounded-md bg-orange-100 p-3">
                  {bankTransferInfo && hasBankTransferInfo(bankTransferInfo) ? (
                    <>
                      <p className="mb-2 font-bold text-orange-800">
                        お振込先
                      </p>
                      <div className="space-y-1 text-sm text-orange-900">
                        <p>銀行名: {bankTransferInfo.bankName}</p>
                        <p>支店名: {bankTransferInfo.branchName}</p>
                        <p>口座種別: {bankTransferInfo.accountType}</p>
                        <p>口座番号: {bankTransferInfo.accountNumber}</p>
                        <p>口座名義: {bankTransferInfo.accountHolder}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-orange-800">
                      お振込先は別途ご連絡いたします。
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
