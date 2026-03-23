import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfirmContent } from "@/components/confirm-content";
import { getCartWithVariants } from "@/db/queries/cart";
import { getAuthenticatedUser } from "@/lib/dal";
import type { CartItemWithVariant } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "注文内容の確認",
};

export default async function ConfirmPage() {
  const user = await getAuthenticatedUser();

  let items: CartItemWithVariant[] = [];
  if (user) {
    items = await getCartWithVariants(user.id);
  }

  if (items.length === 0) {
    redirect("/cart");
  }

  return <ConfirmContent items={items} />;
}
