"use server";

import { revalidatePath } from "next/cache";
import { updateOrderStatus, getOrderWithUserAndItems } from "@/db/queries/orders";
import { sendPickupReadyNotification } from "@/lib/line";
import { formatPickupDate, TIME_SLOT_LABELS } from "@/lib/constants";

export async function updateOrderStatusAction(
  orderId: string,
  status: string
) {
  try {
    await updateOrderStatus(orderId, status);

    // 取り置き注文を「準備完了」にした場合、LINE通知を送信
    if (status === "ready") {
      try {
        const order = await getOrderWithUserAndItems(orderId);
        if (order?.user?.lineUserId && order.fulfillmentMethod === "pickup") {
          const itemsSummary = order.items
            .map((item) => `${item.productName} × ${item.quantity}`)
            .join("、");
          const pickupDate = order.pickupDate
            ? formatPickupDate(order.pickupDate)
            : "未指定";
          const pickupTimeSlot = order.pickupTimeSlot
            ? TIME_SLOT_LABELS[order.pickupTimeSlot] ?? order.pickupTimeSlot
            : "未指定";

          await sendPickupReadyNotification({
            lineUserId: order.user.lineUserId,
            itemsSummary,
            pickupDate,
            pickupTimeSlot,
          });
        }
      } catch (notifyError) {
        console.error("Failed to send pickup ready notification:", notifyError);
        // 通知失敗してもステータス更新自体は成功扱い
      }
    }

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (e) {
    console.error("Failed to update order status:", e);
    return { success: false, error: "注文ステータスの更新に失敗しました" };
  }
}
