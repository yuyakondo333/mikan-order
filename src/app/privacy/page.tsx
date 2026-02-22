import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-orange-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-orange-600">
          プライバシーポリシー
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-gray-700">
          <p>
            みかんの近藤（以下「当店」）は、本サービス「みかん農園
            注文受付アプリ」（以下「本サービス」）における個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
          </p>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              1. 収集する情報
            </h2>
            <p>当店は、本サービスの提供にあたり、以下の情報を取得します。</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>LINEユーザーID、表示名、プロフィール画像</li>
              <li>注文内容（商品名、数量、配送先住所、電話番号）</li>
              <li>お問い合わせ内容</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              2. 利用目的
            </h2>
            <p>取得した個人情報は、以下の目的で利用します。</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>注文の受付・確認・配送</li>
              <li>お客様へのご連絡（注文状況の通知等）</li>
              <li>サービスの改善・運営</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              3. 第三者提供
            </h2>
            <p>
              当店は、法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。ただし、配送業務に必要な範囲で配送業者に情報を提供する場合があります。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              4. 安全管理
            </h2>
            <p>
              当店は、個人情報の漏洩・滅失・毀損を防止するため、適切な安全管理措置を講じます。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              5. 開示・訂正・削除
            </h2>
            <p>
              お客様ご自身の個人情報について、開示・訂正・削除をご希望の場合は、LINEを通じてお問い合わせください。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              6. ポリシーの変更
            </h2>
            <p>
              本ポリシーの内容は、必要に応じて変更することがあります。変更後のポリシーは、本ページに掲載した時点で効力を生じるものとします。
            </p>
          </section>

          <p className="pt-4 text-xs text-gray-500">
            制定日: 2026年2月22日
          </p>
        </div>

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
