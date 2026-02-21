import type { Metadata } from "next";
import { getOrderDetail } from "@/db/queries/orders";
import { OrderDetailView } from "@/components/order-detail-view";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderDetail(id);
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
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();
  return <OrderDetailView order={order} />;
}
