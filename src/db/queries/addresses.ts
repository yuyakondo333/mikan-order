import "server-only";

import { db } from "@/db";
import { addresses, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getLatestAddressByLineUserId(lineUserId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.lineUserId, lineUserId),
  });
  if (!user) return null;

  const userAddresses = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, user.id))
    .orderBy(desc(addresses.createdAt))
    .limit(1);

  return userAddresses[0] ?? null;
}
