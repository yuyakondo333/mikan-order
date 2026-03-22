import "server-only";

import { db } from "@/db";
import { paymentSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getPaymentSettings() {
  const rows = await db.select().from(paymentSettings).limit(1);
  return rows[0] ?? null;
}

export type UpsertPaymentSettingsData = {
  bankName?: string | null;
  branchName?: string | null;
  accountType?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
};

export async function upsertPaymentSettings(data: UpsertPaymentSettingsData) {
  const existing = await getPaymentSettings();

  if (existing) {
    const [updated] = await db
      .update(paymentSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentSettings.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db.insert(paymentSettings).values(data).returning();
  return inserted;
}
