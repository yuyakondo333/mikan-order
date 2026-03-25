import Link from "next/link";

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-4">
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-lg font-semibold text-red-600">
          ログインが必要です
        </p>
        <p className="mt-2 text-sm text-gray-600">
          この機能を利用するにはLINEログインが必要です。
        </p>
        <Link
          href="/products"
          className="mt-4 inline-block rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          商品一覧に戻る
        </Link>
      </div>
    </div>
  );
}
