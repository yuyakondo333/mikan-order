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

export { client as lineClient };
