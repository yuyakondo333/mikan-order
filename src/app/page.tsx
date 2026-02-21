import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-orange-50">
      <main className="flex flex-col items-center gap-8 p-8 text-center">
        <h1 className="text-4xl font-bold text-orange-600">みかん農園</h1>
        <p className="text-lg text-gray-600">
          新鮮なみかんをお届けします
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href="/products"
            className="rounded-full bg-orange-500 px-8 py-3 text-lg font-medium text-white hover:bg-orange-600"
          >
            商品を見る
          </Link>
          <Link
            href="/admin/orders"
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            管理画面
          </Link>
        </div>
      </main>
    </div>
  );
}
