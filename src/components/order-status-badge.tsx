const statusLabels: Record<string, string> = {
  pending: "注文受付",
  awaiting_payment: "入金待ち",
  payment_confirmed: "入金確認済",
  preparing: "準備中",
  ready: "準備完了",
  shipped: "発送済",
  completed: "完了",
  cancelled: "キャンセル",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  awaiting_payment: "bg-orange-100 text-orange-800",
  payment_confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-teal-100 text-teal-800",
  shipped: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-900",
  cancelled: "bg-red-100 text-red-800",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1.5 text-sm font-medium ${statusColors[status] ?? "bg-gray-100 text-gray-900"}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
