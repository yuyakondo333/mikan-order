"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

type CartCountContextValue = {
  count: number;
  setCount: (count: number) => void;
  incrementCount: (delta: number) => void;
};

const CartCountContext = createContext<CartCountContextValue | null>(null);

export function CartCountProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  const [count, setCountRaw] = useState(Math.max(0, initialCount));

  const setCount = useCallback((value: number) => {
    setCountRaw(Math.max(0, value));
  }, []);

  const incrementCount = useCallback((delta: number) => {
    setCountRaw((prev) => Math.max(0, prev + delta));
  }, []);

  return (
    <CartCountContext.Provider value={{ count, setCount, incrementCount }}>
      {children}
    </CartCountContext.Provider>
  );
}

export function useCartCount(): CartCountContextValue {
  const context = useContext(CartCountContext);
  if (!context) {
    throw new Error("useCartCount must be used within a CartCountProvider");
  }
  return context;
}
