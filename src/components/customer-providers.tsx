"use client";

import { SessionProvider } from "next-auth/react";
import { LiffProvider } from "@/components/liff-provider";

export function CustomerProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LiffProvider>{children}</LiffProvider>
    </SessionProvider>
  );
}
