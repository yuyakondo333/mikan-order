// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AdminOrdersTable } from "./orders-table";
import type { Order, Address, User, OrderSummaryItem } from "@/types";

vi.mock("@/components/order-status-badge", () => ({
  OrderStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock("@/app/actions/orders", () => ({
  updateOrderStatusByVariantAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/constants", () => ({
  TIME_SLOT_LABELS: {
    morning: "午前中",
    early_afternoon: "13:00〜15:00",
    late_afternoon: "15:00〜17:00",
  } as Record<string, string>,
  formatPickupDate: (date: string) => date,
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

type OrderWithRelations = Order & {
  user?: User | null;
  address?: Address | null;
  items: OrderSummaryItem[];
};

function makeOrder(
  overrides: Partial<OrderWithRelations> = {}
): OrderWithRelations {
  return {
    id: "order-1",
    userId: "user-1",
    fulfillmentMethod: "pickup",
    pickupDate: "2026-01-15",
    pickupTimeSlot: "morning",
    addressId: null,
    status: "pending",
    totalJpy: 3000,
    note: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    user: {
      id: "user-1",
      lineUserId: "line-1",
      displayName: "テストユーザー",
      pictureUrl: null,
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-01-15T00:00:00.000Z",
    },
    address: null,
    items: [{ productName: "温州みかん", quantity: 1 }],
    ...overrides,
  };
}

async function renderComponent(orders: OrderWithRelations[]) {
  await act(async () => {
    root.render(<AdminOrdersTable initialOrders={orders} />);
  });
}

describe("AdminOrdersTable", () => {
  describe("既存機能のリグレッション", () => {
    it("注文が0件の場合「注文はありません」が表示される", async () => {
      await renderComponent([]);
      expect(container.textContent).toContain("注文はありません");
    });
  });

  describe("商品サマリーの基本表示", () => {
    it("商品1つ・数量1で「商品名 ×1」が表示される", async () => {
      await renderComponent([
        makeOrder({
          items: [{ productName: "温州みかん", quantity: 1 }],
        }),
      ]);
      expect(container.textContent).toContain("温州みかん ×1");
    });

    it("商品1つ・数量複数で「商品名 ×N」が正しく表示される", async () => {
      await renderComponent([
        makeOrder({
          items: [{ productName: "温州みかん", quantity: 3 }],
        }),
      ]);
      expect(container.textContent).toContain("温州みかん ×3");
    });

    it("複数商品の注文で全商品の「商品名 ×N」が表示される", async () => {
      await renderComponent([
        makeOrder({
          items: [
            { productName: "温州みかん", quantity: 1 },
            { productName: "デコポン", quantity: 2 },
          ],
        }),
      ]);
      expect(container.textContent).toContain("温州みかん ×1");
      expect(container.textContent).toContain("デコポン ×2");
    });
  });

  describe("エッジケース", () => {
    it("商品0件（items空配列）の注文でクラッシュしない", async () => {
      await renderComponent([makeOrder({ items: [] })]);
      expect(container.textContent).toContain("¥3,000");
    });

    it("長い商品名が省略されず表示される", async () => {
      await renderComponent([
        makeOrder({
          items: [
            { productName: "愛媛県宇和島産完熟温州みかん特選品", quantity: 1 },
          ],
        }),
      ]);
      expect(container.textContent).toContain(
        "愛媛県宇和島産完熟温州みかん特選品"
      );
    });

    it("同一商品名のアイテムが複数あってもクラッシュしない", async () => {
      await renderComponent([
        makeOrder({
          items: [
            { productName: "温州みかん", quantity: 1 },
            { productName: "温州みかん", quantity: 2 },
          ],
        }),
      ]);
      const text = container.textContent!;
      expect(text).toContain("温州みかん ×1");
      expect(text).toContain("温州みかん ×2");
    });
  });

  describe("複数注文の商品マッピング", () => {
    it("複数の注文カードでそれぞれ正しい商品が表示される", async () => {
      await renderComponent([
        makeOrder({
          id: "order-1",
          items: [{ productName: "温州みかん", quantity: 1 }],
        }),
        makeOrder({
          id: "order-2",
          items: [{ productName: "デコポン", quantity: 2 }],
        }),
      ]);
      const cards = container.querySelectorAll(".rounded-lg");
      expect(cards).toHaveLength(2);
      expect(cards[0].textContent).toContain("温州みかん");
      expect(cards[0].textContent).not.toContain("デコポン");
      expect(cards[1].textContent).toContain("デコポン");
      expect(cards[1].textContent).not.toContain("温州みかん");
    });
  });

  describe("フィルタとの統合", () => {
    it("ステータスフィルタ適用後も商品サマリーが表示される", async () => {
      await renderComponent([
        makeOrder({
          id: "order-1",
          status: "preparing",
          items: [{ productName: "温州みかん", quantity: 2 }],
        }),
        makeOrder({
          id: "order-2",
          status: "completed",
          items: [{ productName: "デコポン", quantity: 1 }],
        }),
      ]);
      // フィルタを「準備中」に変更
      const selects = container.querySelectorAll("select");
      const filterSelect = selects[0];
      await act(async () => {
        filterSelect.dispatchEvent(
          new Event("change", { bubbles: true })
        );
        Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          "value"
        )?.set?.call(filterSelect, "preparing");
        filterSelect.dispatchEvent(
          new Event("change", { bubbles: true })
        );
      });
      expect(container.textContent).toContain("温州みかん ×2");
      expect(container.textContent).not.toContain("デコポン");
    });
  });

  describe("既存機能のリグレッション（追加）", () => {
    it("注文日が日本語フォーマットで表示される", async () => {
      await renderComponent([makeOrder()]);
      expect(container.textContent).toContain("2026/1/15");
    });

    it("合計金額がカンマ区切りで表示される", async () => {
      await renderComponent([makeOrder({ totalJpy: 12500 })]);
      expect(container.textContent).toContain("¥12,500");
    });

    it("顧客名が表示される", async () => {
      await renderComponent([makeOrder()]);
      expect(container.textContent).toContain("テストユーザー");
    });

    it("userがnullでもクラッシュしない", async () => {
      await renderComponent([makeOrder({ user: null })]);
      expect(container.textContent).toContain("¥3,000");
      expect(container.textContent).not.toContain("テストユーザー");
    });

    it("受取方法バッジが表示される", async () => {
      await renderComponent([
        makeOrder({ fulfillmentMethod: "pickup" }),
      ]);
      expect(container.textContent).toContain("取り置き");
    });

    it("取り置き注文の受取詳細が表示される", async () => {
      await renderComponent([
        makeOrder({
          fulfillmentMethod: "pickup",
          pickupDate: "2026-02-01",
          pickupTimeSlot: "morning",
        }),
      ]);
      expect(container.textContent).toContain("受取日:");
      expect(container.textContent).toContain("午前中");
    });

    it("お届け注文の配送先が表示される", async () => {
      await renderComponent([
        makeOrder({
          fulfillmentMethod: "delivery",
          address: {
            id: "addr-1",
            userId: "user-1",
            recipientName: "田中太郎",
            postalCode: "123-4567",
            prefecture: "愛媛県",
            city: "松山市",
            line1: "1-2-3",
            line2: null,
            createdAt: "2026-01-15T00:00:00.000Z",
            updatedAt: "2026-01-15T00:00:00.000Z",
          },
        }),
      ]);
      expect(container.textContent).toContain("田中太郎");
      expect(container.textContent).toContain("123-4567");
      expect(container.textContent).toContain("愛媛県");
    });

    it("フィルタで結果0件時「{ステータス名}の注文はありません」が表示される", async () => {
      await renderComponent([
        makeOrder({ status: "pending" }),
      ]);
      // フィルタを「完了」に変更
      const selects = container.querySelectorAll("select");
      const filterSelect = selects[0];
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          "value"
        )?.set?.call(filterSelect, "completed");
        filterSelect.dispatchEvent(
          new Event("change", { bubbles: true })
        );
      });
      expect(container.textContent).toContain("完了の注文はありません");
    });
  });
});
