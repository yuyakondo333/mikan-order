"use client";

import { LiffProvider } from "@/components/liff-provider";
import { CustomerHeader } from "@/components/customer-header";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      <CustomerHeader />
      {children}
    </LiffProvider>
  );
}
