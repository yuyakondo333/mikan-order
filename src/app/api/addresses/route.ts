import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { addresses, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
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
    .where(eq(addresses.userId, user.id));
  return NextResponse.json(userAddresses);
}
