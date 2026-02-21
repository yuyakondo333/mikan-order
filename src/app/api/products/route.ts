import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const includeAll = request.nextUrl.searchParams.get("all") === "true";

    const allProducts = includeAll
      ? await db.select().from(products)
      : await db
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, variety, weightGrams, priceJpy, description, isAvailable } =
      body;

    if (!name || !variety || !weightGrams || !priceJpy) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      );
    }

    const [product] = await db
      .insert(products)
      .values({
        name,
        variety,
        weightGrams,
        priceJpy,
        description: description || null,
        isAvailable: isAvailable ?? true,
      })
      .returning();

    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error("Failed to create product:", e);
    return NextResponse.json(
      { error: "商品の作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "商品IDが必要です" },
        { status: 400 }
      );
    }

    await db.update(products).set(updates).where(eq(products.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to update product:", e);
    return NextResponse.json(
      { error: "商品の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "商品IDが必要です" },
        { status: 400 }
      );
    }

    await db.delete(products).where(eq(products.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to delete product:", e);
    return NextResponse.json(
      { error: "商品の削除に失敗しました" },
      { status: 500 }
    );
  }
}
