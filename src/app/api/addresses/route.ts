import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { addresses, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const lineUserId = request.nextUrl.searchParams.get("userId");
    if (!lineUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.lineUserId, lineUserId),
    });
    if (!user) return NextResponse.json([]);

    const userAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .orderBy(desc(addresses.createdAt));
    return NextResponse.json(userAddresses);
  } catch (e) {
    console.error("Failed to fetch addresses:", e);
    return NextResponse.json(
      { error: "住所の取得に失敗しました" },
      { status: 500 }
    );
  }
}
