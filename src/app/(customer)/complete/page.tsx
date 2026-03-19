import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "注文完了",
};

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>;
}) {
  const { method } = await searchParams;
  const isPickup = method === "pickup";
  const isDelivery = method === "delivery";

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="mx-auto max-w-md pt-12 text-center">
        <div className="mb-6 text-5xl">&#10003;</div>
        <h1 className="mb-4 text-2xl font-bold text-orange-600">
          ご注文ありがとうございます
        </h1>

        {isPickup && (
          <p className="mb-8 text-gray-700">
            準備ができましたらLINEでお知らせします。
          </p>
        )}
        {isDelivery && (
          <p className="mb-8 text-gray-700">
            振込先をLINEでご案内しますので、お振込をお願いいたします。
          </p>
        )}
        {!isPickup && !isDelivery && (
          <p className="mb-8 text-gray-700">
            注文の詳細は注文履歴からご確認いただけます。
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/orders"
            className="block rounded-full bg-orange-500 py-3 font-medium text-white hover:bg-orange-600"
          >
            注文履歴を見る
          </Link>
          <Link
            href="/products"
            className="block rounded-full border border-gray-300 bg-white py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
