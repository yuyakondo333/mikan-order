import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { getAllOrders } from "@/db/queries/orders";
import { AdminOrdersTable } from "@/components/admin/orders-table";
import { OrdersTableSkeleton } from "@/components/admin/skeletons";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "注文管理",
};

async function OrdersData() {
  const orders = await getAllOrders();
  return <AdminOrdersTable initialOrders={orders} />;
}

export default async function AdminOrdersPage() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) forbidden();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">注文管理</h1>
      <Suspense fallback={<OrdersTableSkeleton />}>
        <OrdersData />
      </Suspense>
    </div>
  );
}
