import type { Metadata } from "next";
import Link from "next/link";
import { getLegalInfo } from "@/db/queries/legal-info";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
};

export default async function LegalPage() {
  const info = await getLegalInfo();

  if (!info) {
    return (
      <div className="min-h-screen bg-orange-50">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <h1 className="mb-8 text-2xl font-bold text-orange-600">
            特定商取引法に基づく表記
          </h1>
          <p className="text-sm text-gray-700">準備中です</p>
          <div className="mt-8">
            <Link
              href="/"
              className="text-sm text-orange-500 underline hover:text-orange-600"
            >
              トップに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = [
    { label: "販売業者", value: info.sellerName },
    { label: "代表者", value: info.representative },
    { label: "所在地", value: info.address },
    { label: "電話番号", value: info.phone },
    ...(info.email ? [{ label: "メールアドレス", value: info.email }] : []),
    { label: "販売価格", value: info.priceInfo },
    { label: "送料", value: info.shippingFee },
    { label: "商品代金以外の必要料金", value: info.additionalCost },
    { label: "お支払い方法", value: info.paymentMethod },
    { label: "お支払い期限", value: info.paymentDeadline },
    { label: "商品の引渡し時期", value: info.deliveryTime },
    { label: "返品・交換について", value: info.returnPolicy },
    ...(info.note ? [{ label: "備考", value: info.note }] : []),
  ];

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-orange-600">
          特定商取引法に基づく表記
        </h1>

        <dl className="space-y-4 text-sm">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="font-semibold text-gray-800">{item.label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-gray-700">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <Link
            href="/"
            className="text-sm text-orange-500 underline hover:text-orange-600"
          >
            トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
