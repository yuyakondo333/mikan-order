import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, products, addresses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        address: true,
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      );
    }

    const itemsWithProduct = await Promise.all(
      order.items.map(async (item) => {
        const product = await db.query.products.findFirst({
          where: eq(products.id, item.productId),
        });
        return {
          ...item,
          productName: product?.name ?? "不明な商品",
          productVariety: product?.variety ?? "",
        };
      })
    );

    return NextResponse.json({
      ...order,
      items: itemsWithProduct,
    });
  } catch (e) {
    console.error("Failed to fetch order detail:", e);
    return NextResponse.json(
      { error: "注文詳細の取得に失敗しました" },
      { status: 500 }
    );
  }
}
