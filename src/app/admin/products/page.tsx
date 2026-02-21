import type { Metadata } from "next";
import { getAllProducts } from "@/db/queries/products";
import { AdminProductsManager } from "@/components/admin/products-manager";

export const metadata: Metadata = {
  title: "商品管理",
};

export default async function AdminProductsPage() {
  const products = await getAllProducts();
  return <AdminProductsManager initialProducts={products} />;
}
