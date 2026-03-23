// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ProductCard } from "./product-card";
import type { ProductWithVariants, ProductVariant } from "@/types";

vi.mock("@/app/actions/products", () => ({
  toggleProductAvailabilityAction: vi.fn(),
  deleteProductAction: vi.fn(),
  createVariantAction: vi.fn(),
  updateVariantAction: vi.fn(),
  deleteVariantAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => <button {...props}>{children}</button>,
  AlertDialogAction: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => <button {...props}>{children}</button>,
}));

const baseVariant: ProductVariant = {
  id: "v1",
  productId: "p1",
  label: "3kg",
  weightKg: "3",
  priceJpy: 1800,
  isGiftOnly: false,
  displayOrder: 0,
  isAvailable: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeProduct(overrides: Partial<ProductWithVariants> = {}): ProductWithVariants {
  return {
    id: "p1",
    name: "テスト商品",
    stockKg: 100,
    imageUrl: null,
    isAvailable: false,
    description: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants: [baseVariant],
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  return () => {
    act(() => root.unmount());
    container.remove();
  };
});

const defaultProps = {
  expanded: false,
  onToggleExpand: vi.fn(),
  onEdit: vi.fn(),
  onProductChange: vi.fn(),
  onProductDelete: vi.fn(),
};

async function renderCard(product: ProductWithVariants) {
  await act(async () => {
    root.render(<ProductCard product={product} {...defaultProps} />);
  });
}

describe("ProductCard — バリエーション0件の公開ボタン制御", () => {
  it("バリエーション0件・非公開の場合、公開ボタンがdisabledになる", async () => {
    const product = makeProduct({ variants: [], isAvailable: false });
    await renderCard(product);

    const button = container.querySelector("button");
    // 最初のボタンが公開/非公開ボタン（テキスト「非公開」を含む）
    const toggleButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "非公開" || b.textContent === "販売中"
    );

    expect(toggleButton).toBeTruthy();
    expect(toggleButton!.disabled).toBe(true);
  });

  it("バリエーション0件の場合、ガイドメッセージが表示される", async () => {
    const product = makeProduct({ variants: [] });
    await renderCard(product);

    expect(container.textContent).toContain("バリエーションを追加すると公開できます");
  });

  it("バリエーション1件以上・非公開の場合、公開ボタンはdisabledでない", async () => {
    const product = makeProduct({ variants: [baseVariant], isAvailable: false });
    await renderCard(product);

    const toggleButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "非公開"
    );

    expect(toggleButton).toBeTruthy();
    expect(toggleButton!.disabled).toBe(false);
  });

  it("バリエーション1件以上の場合、ガイドメッセージは表示されない", async () => {
    const product = makeProduct({ variants: [baseVariant] });
    await renderCard(product);

    expect(container.textContent).not.toContain("バリエーションを追加すると公開できます");
  });
});
