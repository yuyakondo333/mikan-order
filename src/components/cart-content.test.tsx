// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CartCountProvider, useCartCount } from "./cart-count-provider";
import { CartContent } from "./cart-content";
import type { CartItemWithVariant } from "@/types";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockUpdateCartItemByVariant = vi.fn();
const mockRemoveCartItemByVariant = vi.fn();
vi.mock("@/app/actions/cart", () => ({
  updateCartItemByVariant: (...args: unknown[]) =>
    mockUpdateCartItemByVariant(...args),
  removeCartItemByVariant: (...args: unknown[]) =>
    mockRemoveCartItemByVariant(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mockUpdateCartItemByVariant.mockReset();
  mockRemoveCartItemByVariant.mockReset();
  return () => {
    act(() => root.unmount());
    container.remove();
  };
});

function makeCartItem(
  overrides: Partial<CartItemWithVariant> = {}
): CartItemWithVariant {
  return {
    id: "ci-1",
    variantId: "var-1",
    productId: "prod-1",
    quantity: 2,
    productName: "温州みかん",
    productImageUrl: null,
    productIsAvailable: true,
    stockKg: 100,
    label: "3kg",
    weightKg: "3",
    priceJpy: 2000,
    variantIsAvailable: true,
    isGiftOnly: false,
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

function CountDisplay() {
  const { count } = useCartCount();
  return <span data-testid="cart-count">{count}</span>;
}

describe("CartContent", () => {
  describe("数量更新時のカウント更新", () => {
    it("数量増加時にカウントが差分だけ更新される", async () => {
      mockUpdateCartItemByVariant.mockResolvedValue({ success: true });
      const item = makeCartItem({ quantity: 2 });

      await act(async () => {
        root.render(
          <CartCountProvider initialCount={2}>
            <CountDisplay />
            <CartContent items={[item]} />
          </CartCountProvider>
        );
      });

      // 「+」ボタンをクリック (quantity 2 → 3)
      const buttons = Array.from(container.querySelectorAll("button"));
      const plusButton = buttons.find((b) => b.textContent === "+");

      await act(async () => {
        plusButton!.click();
      });

      expect(mockUpdateCartItemByVariant).toHaveBeenCalledWith("var-1", 3);
      expect(
        container.querySelector('[data-testid="cart-count"]')?.textContent
      ).toBe("3");
    });

    it("数量減少時にカウントが差分だけ更新される", async () => {
      mockUpdateCartItemByVariant.mockResolvedValue({ success: true });
      const item = makeCartItem({ quantity: 5 });

      await act(async () => {
        root.render(
          <CartCountProvider initialCount={5}>
            <CountDisplay />
            <CartContent items={[item]} />
          </CartCountProvider>
        );
      });

      // 「-」ボタンをクリック (quantity 5 → 4)
      const buttons = Array.from(container.querySelectorAll("button"));
      const minusButton = buttons.find((b) => b.textContent === "-");

      await act(async () => {
        minusButton!.click();
      });

      expect(mockUpdateCartItemByVariant).toHaveBeenCalledWith("var-1", 4);
      expect(
        container.querySelector('[data-testid="cart-count"]')?.textContent
      ).toBe("4");
    });

    it("updateCartItemByVariant 失敗時にカウントが変わらない", async () => {
      mockUpdateCartItemByVariant.mockResolvedValue({
        success: false,
        error: "在庫が不足しています",
      });
      const item = makeCartItem({ quantity: 2 });

      await act(async () => {
        root.render(
          <CartCountProvider initialCount={2}>
            <CountDisplay />
            <CartContent items={[item]} />
          </CartCountProvider>
        );
      });

      const buttons = Array.from(container.querySelectorAll("button"));
      const plusButton = buttons.find((b) => b.textContent === "+");

      await act(async () => {
        plusButton!.click();
      });

      expect(
        container.querySelector('[data-testid="cart-count"]')?.textContent
      ).toBe("2");
    });
  });

  describe("商品削除時のカウント更新", () => {
    it("removeCartItemByVariant 成功時にカウントが quantity 分減る", async () => {
      mockRemoveCartItemByVariant.mockResolvedValue({ success: true });
      const item = makeCartItem({ quantity: 3 });

      await act(async () => {
        root.render(
          <CartCountProvider initialCount={3}>
            <CountDisplay />
            <CartContent items={[item]} />
          </CartCountProvider>
        );
      });

      const buttons = Array.from(container.querySelectorAll("button"));
      const deleteButton = buttons.find((b) =>
        b.textContent?.includes("削除")
      );

      await act(async () => {
        deleteButton!.click();
      });

      expect(mockRemoveCartItemByVariant).toHaveBeenCalledWith("var-1");
      expect(
        container.querySelector('[data-testid="cart-count"]')?.textContent
      ).toBe("0");
    });

    it("removeCartItemByVariant 失敗時にカウントが変わらない", async () => {
      mockRemoveCartItemByVariant.mockResolvedValue({
        success: false,
        error: "削除に失敗",
      });
      const item = makeCartItem({ quantity: 3 });

      await act(async () => {
        root.render(
          <CartCountProvider initialCount={3}>
            <CountDisplay />
            <CartContent items={[item]} />
          </CartCountProvider>
        );
      });

      const buttons = Array.from(container.querySelectorAll("button"));
      const deleteButton = buttons.find((b) =>
        b.textContent?.includes("削除")
      );

      await act(async () => {
        deleteButton!.click();
      });

      expect(
        container.querySelector('[data-testid="cart-count"]')?.textContent
      ).toBe("3");
    });
  });
});
