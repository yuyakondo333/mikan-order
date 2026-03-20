import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllOrders } from "@/db/queries/orders";
import { AdminOrdersTable } from "@/components/admin/orders-table";
import { OrdersTableSkeleton } from "@/components/admin/skeletons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "注文管理",
};

async function OrdersData() {
  const orders = await getAllOrders();
  return <AdminOrdersTable initialOrders={orders} />;
}

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">注文管理</h1>
      <Suspense fallback={<OrdersTableSkeleton />}>
        <OrdersData />
      </Suspense>
    </div>
  );
}
