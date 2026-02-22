import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-orange-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-orange-600">利用規約</h1>

        <div className="space-y-6 text-sm leading-relaxed text-gray-700">
          <p>
            本利用規約（以下「本規約」）は、みかんの近藤（以下「当店」）が提供する「みかん農園
            注文受付アプリ」（以下「本サービス」）の利用条件を定めるものです。ご利用にあたっては、本規約に同意いただいたものとみなします。
          </p>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              1. サービス内容
            </h2>
            <p>
              本サービスは、LINEを通じたみかん等の農産物の注文受付サービスです。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              2. 利用条件
            </h2>
            <ul className="list-inside list-disc space-y-1">
              <li>LINEアカウントをお持ちの方がご利用いただけます。</li>
              <li>
                注文の確定は、当店からの確認メッセージをもって成立するものとします。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              3. 禁止事項
            </h2>
            <ul className="list-inside list-disc space-y-1">
              <li>虚偽の情報を入力する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>その他、当店が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              4. 免責事項
            </h2>
            <ul className="list-inside list-disc space-y-1">
              <li>
                天候や自然災害等により、商品の提供が困難になる場合があります。
              </li>
              <li>
                本サービスの利用に起因する間接的な損害について、当店は責任を負いかねます。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              5. 支払い
            </h2>
            <p>
              商品代金及び送料の支払い方法は、注文時に案内するものとします。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              6. 規約の変更
            </h2>
            <p>
              当店は、必要に応じて本規約を変更することがあります。変更後の規約は、本ページに掲載した時点で効力を生じるものとします。
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
