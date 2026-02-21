"use client";

import { LiffProvider } from "@/components/liff-provider";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LiffProvider>{children}</LiffProvider>;
}
