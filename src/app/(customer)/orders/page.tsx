import type { Metadata } from "next";
import { OrdersList } from "@/components/orders-list";

export const metadata: Metadata = {
  title: "注文履歴",
};

export default function OrdersPage() {
  return <OrdersList />;
}
