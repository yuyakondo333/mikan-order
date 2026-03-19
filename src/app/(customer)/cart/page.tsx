import type { Metadata } from "next";
import { CartContent } from "@/components/cart-content";
import { getCartWithProducts } from "@/db/queries/cart";
import { getAuthenticatedUser } from "@/lib/dal";
import type { CartItemWithProduct } from "@/types";

export const metadata: Metadata = {
  title: "カート",
};

export default async function CartPage() {
  const user = await getAuthenticatedUser();

  let items: CartItemWithProduct[] = [];
  if (user) {
    items = await getCartWithProducts(user.id);
  }

  return <CartContent items={items} />;
}
