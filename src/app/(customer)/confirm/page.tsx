import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ConfirmContent } from "@/components/confirm-content";
import { getCartWithProducts } from "@/db/queries/cart";
import { upsertUser } from "@/db/queries/users";
import type { CartItemWithProduct } from "@/types";

export const metadata: Metadata = {
  title: "注文内容の確認",
};

export default async function ConfirmPage() {
  const session = await auth();

  let items: CartItemWithProduct[] = [];
  if (session?.user?.lineUserId) {
    const user = await upsertUser({
      lineUserId: session.user.lineUserId,
      displayName: session.user.displayName ?? "",
      pictureUrl: session.user.pictureUrl,
    });
    items = await getCartWithProducts(user.id);
  }

  if (items.length === 0) {
    redirect("/cart");
  }

  return <ConfirmContent items={items} />;
}
