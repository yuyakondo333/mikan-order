"use client";

import { SessionProvider } from "next-auth/react";
import { LiffProvider } from "@/components/liff-provider";
import { CartCountProvider } from "@/components/cart-count-provider";

export function CustomerProviders({
  cartItemCount,
  children,
}: {
  cartItemCount: number;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <LiffProvider>
        <CartCountProvider initialCount={cartItemCount}>
          {children}
        </CartCountProvider>
      </LiffProvider>
    </SessionProvider>
  );
}
