import type { PickupTimeSlot } from "@/types";

export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;

export const TIME_SLOT_OPTIONS: {
  value: PickupTimeSlot;
  label: string;
}[] = [
  { value: "morning", label: "午前中（9:00〜12:00）" },
  { value: "early_afternoon", label: "13:00〜15:00" },
  { value: "late_afternoon", label: "15:00〜17:00" },
];

export const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "午前中（9:00〜12:00）",
  early_afternoon: "13:00〜15:00",
  late_afternoon: "15:00〜17:00",
};

/** 受取可能日のリストを生成（翌日〜14日後） */
export function getPickupDateOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
    const label = d.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    options.push({ value, label });
  }

  return options;
}

/** "YYYY-MM-DD" → "M月D日（曜日）" */
export function formatPickupDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
