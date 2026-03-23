import type { Metadata } from "next";
import { verifySession } from "@/lib/dal";
import { getOrdersByLineUserId } from "@/db/queries/orders";
import { OrdersList } from "@/components/orders-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "注文履歴",
};

export default async function OrdersPage() {
  const session = await verifySession();
  const orders = session
    ? await getOrdersByLineUserId(session.lineUserId)
    : [];

  return <OrdersList orders={orders} />;
}
