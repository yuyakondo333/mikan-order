import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.isAvailable, true));
    return NextResponse.json(allProducts);
  } catch (e) {
    console.error("Failed to fetch products:", e);
    return NextResponse.json(
      { error: "商品の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, isAvailable } = await request.json();
    await db.update(products).set({ isAvailable }).where(eq(products.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to update product:", e);
    return NextResponse.json(
      { error: "商品の更新に失敗しました" },
      { status: 500 }
    );
  }
}
