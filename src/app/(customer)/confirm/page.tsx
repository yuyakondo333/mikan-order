import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfirmContent } from "@/components/confirm-content";
import { getCartWithProducts } from "@/db/queries/cart";
import { getAuthenticatedUser } from "@/lib/dal";
import type { CartItemWithProduct } from "@/types";

export const metadata: Metadata = {
  title: "注文内容の確認",
};

export default async function ConfirmPage() {
  const user = await getAuthenticatedUser();

  let items: CartItemWithProduct[] = [];
  if (user) {
    items = await getCartWithProducts(user.id);
  }

  if (items.length === 0) {
    redirect("/cart");
  }

  return <ConfirmContent items={items} />;
}
