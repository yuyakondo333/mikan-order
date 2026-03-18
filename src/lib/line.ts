import { messagingApi } from "@line/bot-sdk";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export async function sendShippingNotification(
  lineUserId: string,
  orderId: string
) {
  await client.pushMessage({
    to: lineUserId,
    messages: [
      {
        type: "text",
        text: `🍊 ご注文の商品を発送しました！\n注文ID: ${orderId}\nお届けまでしばらくお待ちください。`,
      },
    ],
  });
}

type PickupReadyParams = {
  lineUserId: string;
  itemsSummary: string;
  pickupDate: string;
  pickupTimeSlot: string;
};

export async function sendPickupReadyNotification({
  lineUserId,
  itemsSummary,
  pickupDate,
  pickupTimeSlot,
}: PickupReadyParams) {
  const text = [
    "🍊 ご注文の準備ができました！",
    "",
    `【注文内容】${itemsSummary}`,
    `【受取日】${pickupDate}`,
    `【受取時間】${pickupTimeSlot}`,
    "",
    "店頭にてお受け取りください。",
  ].join("\n");

  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: "text", text }],
  });
}

export { client as lineClient };
