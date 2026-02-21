const statusLabels: Record<string, string> = {
  pending: "受付中",
  confirmed: "確認済み",
  preparing: "準備中",
  shipped: "発送済み",
  delivered: "配達完了",
  cancelled: "キャンセル",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
