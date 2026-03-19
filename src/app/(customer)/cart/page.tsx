import type { Metadata } from "next";
import { auth } from "@/auth";
import { CartContent } from "@/components/cart-content";
import { getCartWithProducts, deleteExpiredCartItems } from "@/db/queries/cart";
import { upsertUser } from "@/db/queries/users";
import type { CartItemWithProduct } from "@/types";

export const metadata: Metadata = {
  title: "カート",
};

export default async function CartPage() {
  const session = await auth();

  let items: CartItemWithProduct[] = [];
  if (session?.user?.lineUserId) {
    const user = await upsertUser({
      lineUserId: session.user.lineUserId,
      displayName: session.user.displayName ?? "",
      pictureUrl: session.user.pictureUrl,
    });
    await deleteExpiredCartItems(user.id);
    items = await getCartWithProducts(user.id);
  }

  return <CartContent items={items} />;
}
