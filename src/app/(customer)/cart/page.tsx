import type { Metadata } from "next";
import { CartContent } from "@/components/cart-content";
import { getCartWithVariants } from "@/db/queries/cart";
import { getAuthenticatedUser } from "@/lib/dal";
import type { CartItemWithVariant } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "カート",
};

export default async function CartPage() {
  const user = await getAuthenticatedUser();

  let items: CartItemWithVariant[] = [];
  if (user) {
    items = await getCartWithVariants(user.id);
  }

  return <CartContent items={items} />;
}
