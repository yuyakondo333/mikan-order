import type { Metadata } from "next";
import { getAllOrders } from "@/db/queries/orders";
import { AdminOrdersTable } from "@/components/admin/orders-table";

export const metadata: Metadata = {
  title: "注文管理",
};

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">注文管理</h1>
      <AdminOrdersTable initialOrders={orders} />
    </div>
  );
}
