// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CartCountProvider, useCartCount } from "./cart-count-provider";
import { ProductList } from "./product-list";
import type { ProductWithVariants } from "@/types";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockAddToCartByVariant = vi.fn();
vi.mock("@/app/actions/cart", () => ({
  addToCartByVariant: (...args: unknown[]) => mockAddToCartByVariant(...args),
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
  mockAddToCartByVariant.mockReset();
  return () => {
    act(() => root.unmount());
    container.remove();
  };
});

function makeProduct(overrides: Partial<ProductWithVariants> = {}): ProductWithVariants {
  return {
    id: "prod-1",
    name: "温州みかん",
    description: "美味しいみかん",
    imageUrl: null,
    isAvailable: true,
    stockKg: 100,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    variants: [
      {
        id: "var-1",
        productId: "prod-1",
        label: "3kg",
        weightKg: "3",
        priceJpy: 2000,
        isGiftOnly: false,
        isAvailable: true,
        displayOrder: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
    ...overrides,
  };
}

function CountDisplay() {
  const { count } = useCartCount();
  return <span data-testid="cart-count">{count}</span>;
}

describe("ProductList", () => {
  it("addToCartByVariant 成功時にカートカウントが quantity 分増える", async () => {
    mockAddToCartByVariant.mockResolvedValue({ success: true });

    await act(async () => {
      root.render(
        <CartCountProvider initialCount={0}>
          <CountDisplay />
          <ProductList products={[makeProduct()]} />
        </CartCountProvider>
      );
    });

    // 「カートに追加」ボタンをクリック
    const addButton = container.querySelector(
      'button'
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    const cartButton = buttons.find((b) =>
      b.textContent?.includes("カートに追加")
    );
    expect(cartButton).not.toBeNull();

    await act(async () => {
      cartButton!.click();
    });

    expect(mockAddToCartByVariant).toHaveBeenCalledWith("var-1", 1);
    expect(
      container.querySelector('[data-testid="cart-count"]')?.textContent
    ).toBe("1");
  });

  it("addToCartByVariant 失敗時にカートカウントが変化しない", async () => {
    mockAddToCartByVariant.mockResolvedValue({
      success: false,
      error: "在庫が不足しています",
    });

    await act(async () => {
      root.render(
        <CartCountProvider initialCount={3}>
          <CountDisplay />
          <ProductList products={[makeProduct()]} />
        </CartCountProvider>
      );
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    const cartButton = buttons.find((b) =>
      b.textContent?.includes("カートに追加")
    );

    await act(async () => {
      cartButton!.click();
    });

    expect(
      container.querySelector('[data-testid="cart-count"]')?.textContent
    ).toBe("3");
  });
});
