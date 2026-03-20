import "server-only";

import { db } from "@/db";
import { legalInfo } from "@/db/schema";

export async function getLegalInfo() {
  const rows = await db.select().from(legalInfo);
  return rows[0] ?? null;
}
