// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ProductForm } from "./product-form";
import type { ProductWithVariants, ProductVariant } from "@/types";

vi.mock("@/app/actions/products", () => ({
  createProductWithVariantsAction: vi.fn(),
  updateProductV2Action: vi.fn(),
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
  onCreated: vi.fn(),
  onUpdated: vi.fn(),
  onCancel: vi.fn(),
};

async function renderForm(editingProduct?: ProductWithVariants) {
  await act(async () => {
    root.render(
      <ProductForm editingProduct={editingProduct} {...defaultProps} />
    );
  });
}

describe("ProductForm — 編集時バリエーション0件の公開チェックボックス制御", () => {
  it("編集モードでバリエーション0件の場合、公開チェックボックスがdisabledになる", async () => {
    const product = makeProduct({ variants: [] });
    await renderForm(product);

    const checkbox = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    );
    expect(checkbox).toBeTruthy();
    expect(checkbox!.disabled).toBe(true);
  });

  it("編集モードでバリエーション0件の場合、ガイドメッセージが表示される", async () => {
    const product = makeProduct({ variants: [] });
    await renderForm(product);

    expect(container.textContent).toContain("バリエーションを追加すると公開できます");
  });

  it("編集モードでバリエーション1件以上の場合、公開チェックボックスは有効", async () => {
    const product = makeProduct({ variants: [baseVariant] });
    await renderForm(product);

    const checkbox = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    );
    expect(checkbox).toBeTruthy();
    expect(checkbox!.disabled).toBe(false);
  });

  it("新規作成モードでは公開チェックボックスはdisabledでない", async () => {
    await renderForm();

    // 新規作成モードの「公開する」チェックボックスを探す
    const labels = Array.from(container.querySelectorAll("label"));
    const publishLabel = labels.find((l) => l.textContent?.includes("公開する"));
    const checkbox = publishLabel?.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    );
    expect(checkbox).toBeTruthy();
    expect(checkbox!.disabled).toBe(false);
  });
});
