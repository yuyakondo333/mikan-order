import type { Metadata } from "next";
import { getAllProductsWithVariants } from "@/db/queries/products";
import { AdminProductsManager } from "@/components/admin/products-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "商品管理",
};

export default async function AdminProductsPage() {
  const products = await getAllProductsWithVariants();
  return <AdminProductsManager initialProducts={products} />;
}
