import type { Metadata } from "next";
import { getAvailableProductsWithVariants } from "@/db/queries/products";
import { ProductList } from "@/components/product-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "商品一覧",
};

export default async function ProductsPage() {
  const products = await getAvailableProductsWithVariants();

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">商品一覧</h1>
      <ProductList products={products} />
    </div>
  );
}
