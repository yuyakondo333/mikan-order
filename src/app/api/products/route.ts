import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.isAvailable, true));
  return NextResponse.json(allProducts);
}

export async function PATCH(request: NextRequest) {
  const { id, isAvailable } = await request.json();
  await db.update(products).set({ isAvailable }).where(eq(products.id, id));
  return NextResponse.json({ success: true });
}
