import { messagingApi } from "@line/bot-sdk";
import type { BankTransferInfo } from "@/types";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

type ShippingNotificationParams = {
  lineUserId: string;
  itemsSummary: string;
};

export async function sendShippingNotification({
  lineUserId,
  itemsSummary,
}: ShippingNotificationParams) {
  const text = [
    "🍊 ご注文の商品を発送しました！",
    "",
    `【注文内容】${itemsSummary}`,
    "",
    "お届けまでしばらくお待ちください。",
  ].join("\n");

  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: "text", text }],
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

function hasBankTransferInfo(info: BankTransferInfo): boolean {
  return !!(
    info.bankName &&
    info.branchName &&
    info.accountType &&
    info.accountNumber &&
    info.accountHolder
  );
}

export async function sendOrderConfirmationWithBankTransfer(
  lineUserId: string,
  totalJpy: number,
  bankInfo: BankTransferInfo
) {
  const bankSection = hasBankTransferInfo(bankInfo)
    ? [
        "━━━ お振込先 ━━━",
        `銀行名: ${bankInfo.bankName}`,
        `支店名: ${bankInfo.branchName}`,
        `口座種別: ${bankInfo.accountType}`,
        `口座番号: ${bankInfo.accountNumber}`,
        `口座名義: ${bankInfo.accountHolder}`,
        "━━━━━━━━━━━━",
      ]
    : ["お振込先は別途ご連絡いたします。"];

  await client.pushMessage({
    to: lineUserId,
    messages: [
      {
        type: "text",
        text: [
          "🍊 ご注文ありがとうございます！",
          "",
          `合計金額: ¥${totalJpy.toLocaleString()}`,
          "",
          ...bankSection,
          "",
          "※ご入金確認後、準備を開始いたします。",
        ].join("\n"),
      },
    ],
  });
}

type OrderConfirmationWithPickupParams = {
  lineUserId: string;
  pickupDate: string;
  pickupTimeSlot: string;
};

export async function sendOrderConfirmationWithPickup({
  lineUserId,
  pickupDate,
  pickupTimeSlot,
}: OrderConfirmationWithPickupParams) {
  await client.pushMessage({
    to: lineUserId,
    messages: [
      {
        type: "text",
        text: [
          "🍊 ご注文ありがとうございます！",
          "",
          `【受取日】${pickupDate}`,
          `【受取時間】${pickupTimeSlot}`,
          "",
          "店頭にてお支払いください。",
        ].join("\n"),
      },
    ],
  });
}

export { client as lineClient };
