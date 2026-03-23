// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { OrdersList } from "./orders-list";
import type { OrderWithItems } from "@/types";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
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

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: "order-1",
    userId: "user-1",
    fulfillmentMethod: "delivery",
    pickupDate: null,
    pickupTimeSlot: null,
    addressId: null,
    status: "awaiting_payment",
    totalJpy: 3000,
    note: null,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    items: [{ productName: "温州みかん", quantity: 1 }],
    ...overrides,
  };
}

async function renderComponent(orders: OrderWithItems[]) {
  await act(async () => {
    root.render(<OrdersList orders={orders} />);
  });
}

describe("OrdersList", () => {
  describe("既存機能のリグレッション", () => {
    it("注文が0件の場合、「注文履歴はありません」が表示される", async () => {
      await renderComponent([]);
      expect(container.textContent).toContain("注文履歴はありません");
    });

    it("注文日が日本語フォーマットで表示される", async () => {
      await renderComponent([makeOrder()]);
      expect(container.textContent).toContain("2026/1/15");
    });

    it("合計金額がカンマ区切りで表示される", async () => {
      await renderComponent([makeOrder({ totalJpy: 12500 })]);
      expect(container.textContent).toContain("¥12,500");
    });
  });

  describe("商品サマリー表示", () => {
    it("商品1つの注文で商品名が表示される", async () => {
      await renderComponent([
        makeOrder({
          items: [{ productName: "温州みかん", quantity: 1 }],
        }),
      ]);
      expect(container.textContent).toContain("温州みかん");
    });

    it("商品1つ・数量1の注文で「×1」が表示される", async () => {
      await renderComponent([
        makeOrder({
          items: [{ productName: "温州みかん", quantity: 1 }],
        }),
      ]);
      expect(container.textContent).toContain("温州みかん ×1");
    });

    it("商品1つ・数量が複数の注文で数量が正しく表示される", async () => {
      await renderComponent([
        makeOrder({
          items: [{ productName: "温州みかん", quantity: 3 }],
        }),
      ]);
      expect(container.textContent).toContain("温州みかん ×3");
    });

    it("商品2つの注文で全商品名が表示される", async () => {
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
    it("商品0件の注文でクラッシュしない", async () => {
      await renderComponent([makeOrder({ items: [] })]);
      expect(container.textContent).toContain("¥3,000");
    });

    it("長い商品名が表示される", async () => {
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
  });

  describe("複数注文の商品マッピング", () => {
    it("複数注文でそれぞれの注文カードに正しい商品が表示される", async () => {
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
      const links = container.querySelectorAll("a");
      expect(links).toHaveLength(2);
      expect(links[0].textContent).toContain("温州みかん");
      expect(links[0].textContent).not.toContain("デコポン");
      expect(links[1].textContent).toContain("デコポン");
      expect(links[1].textContent).not.toContain("温州みかん");
    });
  });
});
