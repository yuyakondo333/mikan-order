import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-4">
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900">
          注文が見つかりません
        </p>
        <p className="mt-2 text-sm text-gray-500">
          指定された注文は存在しないか、削除されました。
        </p>
        <Link
          href="/orders"
          className="mt-4 inline-block rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          注文履歴に戻る
        </Link>
      </div>
    </div>
  );
}
