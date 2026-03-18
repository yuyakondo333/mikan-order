import type { PickupTimeSlot } from "@/types";

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
