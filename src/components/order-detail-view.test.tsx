// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { OrderDetailView } from "./order-detail-view";
import type { BankTransferInfo } from "@/types";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/constants", () => ({
  TIME_SLOT_LABELS: { morning: "午前中" } as Record<string, string>,
  formatPickupDate: (d: string) => d,
}));

vi.mock("@/components/order-status-badge", () => ({
  OrderStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  return () => {
    act(() => root.unmount());
    container.remove();
  };
});

async function renderComponent(props: Parameters<typeof OrderDetailView>[0]) {
  await act(async () => {
    root.render(<OrderDetailView {...props} />);
  });
}

const baseDeliveryOrder = {
  id: "order-1",
  status: "awaiting_payment",
  fulfillmentMethod: "delivery",
  pickupDate: null,
  pickupTimeSlot: null,
  totalJpy: 3000,
  note: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  address: {
    id: "addr-1",
    userId: "user-1",
    recipientName: "山田太郎",
    postalCode: "1000001",
    prefecture: "東京都",
    city: "千代田区",
    line1: "丸の内1-1-1",
    line2: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      productName: "温州みかん",
      label: "3kg箱",
      quantity: 1,
      unitPriceJpy: 3000,
    },
  ],
};

const pickupOrder = {
  ...baseDeliveryOrder,
  fulfillmentMethod: "pickup",
  pickupDate: "2026-01-15",
  pickupTimeSlot: "morning",
  address: null,
};

const fullBankInfo: BankTransferInfo = {
  bankName: "みかん銀行",
  branchName: "果実支店",
  accountType: "普通",
  accountNumber: "1234567",
  accountHolder: "ミカンノウエン",
};

describe("OrderDetailView 振込先表示", () => {
  it("配送 + awaiting_payment + 振込先あり → 振込先5フィールドが表示される", async () => {
    await renderComponent({
      order: baseDeliveryOrder,
      bankTransferInfo: fullBankInfo,
    });

    expect(container.textContent).toContain("お振込先");
    expect(container.textContent).toContain("みかん銀行");
    expect(container.textContent).toContain("果実支店");
    expect(container.textContent).toContain("普通");
    expect(container.textContent).toContain("1234567");
    expect(container.textContent).toContain("ミカンノウエン");
  });

  it("配送 + awaiting_payment + 振込先全フィールドnull → フォールバックテキスト表示", async () => {
    const nullBankInfo: BankTransferInfo = {
      bankName: null,
      branchName: null,
      accountType: null,
      accountNumber: null,
      accountHolder: null,
    };
    await renderComponent({
      order: baseDeliveryOrder,
      bankTransferInfo: nullBankInfo,
    });

    expect(container.textContent).toContain("お振込先は別途ご連絡いたします。");
    expect(container.textContent).not.toContain("お振込先銀行名");
  });

  it("配送 + awaiting_payment + bankTransferInfo=null → フォールバック表示（クラッシュしない）", async () => {
    await renderComponent({
      order: baseDeliveryOrder,
      bankTransferInfo: null,
    });

    expect(container.textContent).toContain("お振込先は別途ご連絡いたします。");
  });

  it("取り置き注文 → 振込先セクション非表示、取り置きUI正常", async () => {
    await renderComponent({
      order: pickupOrder,
    });

    expect(container.textContent).not.toContain("お振込先");
    expect(container.textContent).toContain("取り置き");
    expect(container.textContent).toContain("店頭でお支払い");
  });

  it("配送 + payment_confirmed → 振込先セクション非表示 + 銀行振込テキストは表示", async () => {
    await renderComponent({
      order: { ...baseDeliveryOrder, status: "payment_confirmed" },
      bankTransferInfo: fullBankInfo,
    });

    expect(container.textContent).not.toContain("お振込先");
    expect(container.textContent).toContain("銀行振込（事前入金）");
  });

  it("配送 + preparing → 振込先セクション非表示 + 銀行振込テキストは表示", async () => {
    await renderComponent({
      order: { ...baseDeliveryOrder, status: "preparing" },
      bankTransferInfo: fullBankInfo,
    });

    expect(container.textContent).not.toContain("お振込先");
    expect(container.textContent).toContain("銀行振込（事前入金）");
  });
});
