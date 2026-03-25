import type { Metadata } from "next";
import { getOrderDetailV2 } from "@/db/queries/orders";
import { getPaymentSettings } from "@/db/queries/payment-settings";
import { getAuthenticatedUser } from "@/lib/dal";
import { OrderDetailView } from "@/components/order-detail-view";
import { notFound, unauthorized } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { title: "注文が見つかりません" };
  }

  const { id } = await params;
  const order = await getOrderDetailV2(id, user.id);
  if (!order) {
    return { title: "注文が見つかりません" };
  }
  return {
    title: `注文詳細 - ${new Date(order.createdAt).toLocaleDateString("ja-JP")}`,
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) unauthorized();

  const { id } = await params;
  const order = await getOrderDetailV2(id, user.id);
  if (!order) notFound();

  const bankTransferInfo =
    order.fulfillmentMethod === "delivery" && order.status === "awaiting_payment"
      ? await getPaymentSettings()
      : null;

  return <OrderDetailView order={order} bankTransferInfo={bankTransferInfo} />;
}
