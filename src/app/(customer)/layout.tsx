"use client";

import { SessionProvider } from "next-auth/react";
import { LiffProvider } from "@/components/liff-provider";
import { CustomerHeader } from "@/components/customer-header";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <LiffProvider>
        <CustomerHeader />
        {children}
      </LiffProvider>
    </SessionProvider>
  );
}
