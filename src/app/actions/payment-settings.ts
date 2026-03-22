"use server";

import { revalidatePath } from "next/cache";
import {
  upsertPaymentSettings,
  type UpsertPaymentSettingsData,
} from "@/db/queries/payment-settings";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const paymentSettingsSchema = z.object({
  bankName: z.string().nullish(),
  branchName: z.string().nullish(),
  accountType: z.string().nullish(),
  accountNumber: z.string().nullish(),
  accountHolder: z.string().nullish(),
});

export async function upsertPaymentSettingsAction(
  data: UpsertPaymentSettingsData
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsed = paymentSettingsSchema.safeParse(data);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "入力内容に誤りがあります";
    return { success: false, error: firstError };
  }

  try {
    const result = await upsertPaymentSettings({
      bankName: parsed.data.bankName || null,
      branchName: parsed.data.branchName || null,
      accountType: parsed.data.accountType || null,
      accountNumber: parsed.data.accountNumber || null,
      accountHolder: parsed.data.accountHolder || null,
    });
    revalidatePath("/admin/payment");
    return { success: true, data: result };
  } catch (e) {
    console.error("Failed to upsert payment settings:", e);
    return { success: false, error: "お支払い設定の保存に失敗しました" };
  }
}
