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
