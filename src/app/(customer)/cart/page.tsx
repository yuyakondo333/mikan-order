import type { Metadata } from "next";
import { CartContent } from "@/components/cart-content";

export const metadata: Metadata = {
  title: "カート",
};

export default function CartPage() {
  return <CartContent />;
}
