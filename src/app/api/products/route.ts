import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableProducts,
  getAllProducts,
} from "@/db/queries/products";

export async function GET(request: NextRequest) {
  try {
    const includeAll = request.nextUrl.searchParams.get("all") === "true";
    const allProducts = includeAll
      ? await getAllProducts()
      : await getAvailableProducts();
    return NextResponse.json(allProducts);
  } catch (e) {
    console.error("Failed to fetch products:", e);
    return NextResponse.json(
      { error: "商品の取得に失敗しました" },
      { status: 500 }
    );
  }
}
