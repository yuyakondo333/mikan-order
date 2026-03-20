"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CartItem } from "@/components/cart-item";
import {
  updateCartItemByVariant,
  removeCartItemByVariant,
} from "@/app/actions/cart";
import type { CartItemWithVariant } from "@/types";

export function CartContent({ items }: { items: CartItemWithVariant[] }) {
  const [isPending, startTransition] = useTransition();

  function handleUpdateQuantity(variantId: string, quantity: number) {
    startTransition(async () => {
      await updateCartItemByVariant(variantId, quantity);
    });
  }

  function handleRemove(variantId: string) {
    startTransition(async () => {
      await removeCartItemByVariant(variantId);
    });
  }

  const total = items.reduce(
    (sum, item) => sum + item.priceJpy * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">カート</h1>
      {items.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-700">カートは空です</p>
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
            {items.map((item) => (
              <CartItem
                key={item.variantId}
                id={item.variantId}
                name={item.productName}
                label={item.label}
                priceJpy={item.priceJpy}
                quantity={item.quantity}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            ))}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-lg font-bold text-gray-900">
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
            <Link href="/products" className="text-orange-500 underline">
              買い物を続ける
            </Link>
          </div>
          {isPending && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
              <div className="rounded-lg bg-white px-6 py-3 shadow-lg">
                更新中...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
