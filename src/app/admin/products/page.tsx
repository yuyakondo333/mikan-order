import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAllProductsWithVariants } from "@/db/queries/products";
import { AdminProductsManager } from "@/components/admin/products-manager";
import { ProductsListSkeleton } from "@/components/admin/skeletons";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "商品管理",
};

async function ProductsData() {
  const products = await getAllProductsWithVariants();
  return <AdminProductsManager initialProducts={products} />;
}

export default async function AdminProductsPage() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect("/admin/login");
  return (
    <Suspense fallback={<ProductsManagerSkeleton />}>
      <ProductsData />
    </Suspense>
  );
}

function ProductsManagerSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
        <div className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white opacity-50">
          + 商品を追加
        </div>
      </div>
      <ProductsListSkeleton />
    </div>
  );
}
