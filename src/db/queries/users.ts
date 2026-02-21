import "server-only";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function upsertUser(data: {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string | null;
}) {
  let user = await db.query.users.findFirst({
    where: eq(users.lineUserId, data.lineUserId),
  });
  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        lineUserId: data.lineUserId,
        displayName: data.displayName,
        pictureUrl: data.pictureUrl ?? null,
      })
      .returning();
    user = newUser;
  }
  return user;
}
