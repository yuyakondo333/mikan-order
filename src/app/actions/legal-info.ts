"use server";

import { revalidatePath } from "next/cache";
import { upsertLegalInfo } from "@/db/queries/legal-info";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const legalInfoSchema = z.object({
  sellerName: z.string().min(1, "販売業者名は必須です"),
  representative: z.string().min(1, "代表者名は必須です"),
  address: z.string().min(1, "所在地は必須です"),
  phone: z.string().min(1, "電話番号は必須です"),
  email: z.string().email("メールアドレスの形式が不正です").nullish().or(z.literal("")),
  priceInfo: z.string().min(1, "販売価格の記載は必須です"),
  shippingFee: z.string().min(1, "送料の記載は必須です"),
  additionalCost: z.string().min(1, "追加費用の記載は必須です"),
  paymentMethod: z.string().min(1, "支払方法の記載は必須です"),
  paymentDeadline: z.string().min(1, "支払期限の記載は必須です"),
  deliveryTime: z.string().min(1, "引渡時期の記載は必須です"),
  returnPolicy: z.string().min(1, "返品ポリシーの記載は必須です"),
  note: z.string().nullish(),
});

export async function upsertLegalInfoAction(data: {
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
}) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "管理者認証が必要です" };

  const parsed = legalInfoSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "入力内容に誤りがあります";
    return { success: false, error: firstError };
  }

  try {
    const result = await upsertLegalInfo({
      ...parsed.data,
      email: parsed.data.email || null,
      note: parsed.data.note || null,
    });
    revalidatePath("/admin/legal");
    revalidatePath("/legal");
    return { success: true, data: result };
  } catch (e) {
    console.error("Failed to upsert legal info:", e);
    return { success: false, error: "特定商取引法情報の保存に失敗しました" };
  }
}
