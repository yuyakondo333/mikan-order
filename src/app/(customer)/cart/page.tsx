"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CartItem } from "@/components/cart-item";
import type { CartItemType } from "@/types";

export default function CartPage() {
  const [cart, setCart] = useState<CartItemType[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("cart") ?? "[]");
    setCart(stored);
  }, []);

  function updateCart(newCart: CartItemType[]) {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cart-updated"));
  }

  function handleUpdateQuantity(id: string, quantity: number) {
    if (quantity < 1) return;
    updateCart(
      cart.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }

  function handleRemove(id: string) {
    updateCart(cart.filter((item) => item.id !== id));
  }

  const total = cart.reduce(
    (sum, item) => sum + item.priceJpy * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">カート</h1>
      {cart.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-500">カートは空です</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-orange-500 underline"
          >
            商品一覧に戻る
          </Link>
        </div>
      ) : (
        <div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            {cart.map((item) => (
              <CartItem
                key={item.id}
                {...item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            ))}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-lg font-bold">
                合計: ¥{total.toLocaleString()}
              </span>
              <Link
                href="/address"
                className="rounded-full bg-orange-500 px-6 py-2 text-white hover:bg-orange-600"
              >
                注文へ進む
              </Link>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/products"
              className="text-orange-500 underline"
            >
              買い物を続ける
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
