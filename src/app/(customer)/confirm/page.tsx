import type { Metadata } from "next";
import { ConfirmContent } from "@/components/confirm-content";

export const metadata: Metadata = {
  title: "注文内容の確認",
};

export default function ConfirmPage() {
  return <ConfirmContent />;
}
