import "server-only";

import { db } from "@/db";
import { legalInfo } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getLegalInfo() {
  const rows = await db.select().from(legalInfo).limit(1);
  return rows[0] ?? null;
}

export type UpsertLegalInfoData = {
  sellerName: string;
  representative: string;
  address: string;
  phone: string;
  email?: string | null;
  priceInfo: string;
  shippingFee: string;
  additionalCost: string;
  paymentMethod: string;
  paymentDeadline: string;
  deliveryTime: string;
  returnPolicy: string;
  note?: string | null;
};

export async function upsertLegalInfo(data: UpsertLegalInfoData) {
  const existing = await getLegalInfo();

  if (existing) {
    const [updated] = await db
      .update(legalInfo)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(legalInfo.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db.insert(legalInfo).values(data).returning();
  return inserted;
}
