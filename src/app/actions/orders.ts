"use server";

import { revalidatePath } from "next/cache";
import { updateOrderStatus } from "@/db/queries/orders";

export async function updateOrderStatusAction(
  orderId: string,
  status: string
) {
  try {
    await updateOrderStatus(orderId, status);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (e) {
    console.error("Failed to update order status:", e);
    return { success: false, error: "注文ステータスの更新に失敗しました" };
  }
}
