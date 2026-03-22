import type { Metadata } from "next";
import { HelpAccordion } from "@/components/help-accordion";

export const metadata: Metadata = {
  title: "ヘルプ",
};

const sections = [
  {
    title: "ご注文の流れ",
    content: [
      {
        type: "steps" as const,
        items: [
          "商品を選んでカートに入れる",
          "受取方法を選ぶ（取り置き or お届け）",
          "注文内容を確認して注文を確定",
          "LINEで注文確認メッセージが届く",
        ],
      },
    ],
  },
  {
    title: "受取方法について",
    content: [
      {
        type: "subsection" as const,
        title: "取り置き（店頭受取）",
        items: [
          "受取日と時間帯を選んで注文します",
          "お支払いは受取時に現金でお願いします",
          "準備ができましたらLINEでお知らせします",
        ],
      },
      {
        type: "subsection" as const,
        title: "お届け（配送）",
        items: [
          "配送先の住所を入力して注文します",
          "お支払いは銀行振込（事前入金）です",
          "入金確認後に発送し、発送時にLINEでお知らせします",
        ],
      },
    ],
  },
  {
    title: "お支払いについて",
    content: [
      {
        type: "subsection" as const,
        title: "取り置きの場合",
        items: ["受取時に店頭で現金にてお支払いください"],
      },
      {
        type: "subsection" as const,
        title: "お届けの場合",
        items: [
          "注文確定後、LINEで振込先をご案内します",
          "ご入金の確認が取れ次第、発送準備を開始します",
        ],
      },
    ],
  },
  {
    title: "注文ステータスについて",
    content: [
      {
        type: "subsection" as const,
        title: "取り置きの場合",
        items: [
          "注文受付 — ご注文を受け付けました",
          "準備中 — 商品を準備しています",
          "準備完了 — 店頭でお受け取りいただけます",
          "完了 — お受け取り済み",
        ],
      },
      {
        type: "subsection" as const,
        title: "お届けの場合",
        items: [
          "入金待ち — お振込をお待ちしています",
          "入金確認済 — ご入金を確認しました",
          "準備中 — 商品を準備しています",
          "発送済 — 商品を発送しました",
          "完了 — お届け済み",
        ],
      },
    ],
  },
  {
    title: "よくある質問",
    content: [
      {
        type: "faq" as const,
        question: "振込先の案内が届きません",
        answer:
          "LINEのトーク履歴をご確認ください。見つからない場合は、LINEでお気軽にお問い合わせください。",
      },
      {
        type: "faq" as const,
        question: "注文の確認メッセージが届きません",
        answer:
          "LINEの通知設定をご確認ください。通知がオフになっている場合、メッセージが届かないことがあります。",
      },
      {
        type: "faq" as const,
        question: "注文内容を変更したい",
        answer: "LINEでお気軽にご連絡ください。",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">ヘルプ</h1>
      <div className="space-y-3">
        {sections.map((section) => (
          <HelpAccordion key={section.title} title={section.title}>
            <div className="space-y-4">
              {section.content.map((block, i) => {
                if (block.type === "steps") {
                  return (
                    <ol key={i} className="space-y-2">
                      {block.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                            {j + 1}
                          </span>
                          <span className="text-sm text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ol>
                  );
                }
                if (block.type === "subsection") {
                  return (
                    <div key={i}>
                      <h3 className="mb-2 text-sm font-semibold text-gray-800">
                        {block.title}
                      </h3>
                      <ul className="space-y-1">
                        {block.items.map((item, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-2 text-sm text-gray-700"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                if (block.type === "faq") {
                  return (
                    <div key={i}>
                      <p className="mb-1 text-sm font-semibold text-gray-800">
                        Q. {block.question}
                      </p>
                      <p className="text-sm text-gray-700">A. {block.answer}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </HelpAccordion>
        ))}
      </div>
    </div>
  );
}
