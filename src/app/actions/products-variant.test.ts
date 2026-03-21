import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("server-only", () => ({}));

vi.mock("@/db/queries/products", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

vi.mock("@/db/queries/variants", () => ({
  createVariant: vi.fn(),
  updateVariant: vi.fn(),
  deleteVariant: vi.fn(),
  countVariantsByProductId: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn<() => Promise<Session | null>>(),
}));
vi.mock("@/auth", () => ({ auth: mockAuth }));

import { createProduct, updateProduct, deleteProduct } from "@/db/queries/products";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  countVariantsByProductId,
} from "@/db/queries/variants";
import {
  createProductWithVariantsAction,
  updateProductV2Action,
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
} from "@/app/actions/products";

const mockCreateProduct = vi.mocked(createProduct);
const mockUpdateProduct = vi.mocked(updateProduct);
const mockDeleteProduct = vi.mocked(deleteProduct);
const mockCreateVariant = vi.mocked(createVariant);
const mockUpdateVariant = vi.mocked(updateVariant);
const mockDeleteVariant = vi.mocked(deleteVariant);
const mockCountVariants = vi.mocked(countVariantsByProductId);

function setupAdmin() {
  mockAuth.mockResolvedValue({
    user: { role: "admin", email: "admin@example.com" },
    expires: "",
  } as Session);
}

function setupNoAdmin() {
  mockAuth.mockResolvedValue(null);
}

describe("createProductWithVariantsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // G1: 非管理者 → エラー
  it("非管理者でエラーを返す", async () => {
    setupNoAdmin();

    const result = await createProductWithVariantsAction(
      { name: "test", stockKg: 10 },
      [{ label: "3kg", weightKg: "3", priceJpy: 1800 }]
    );

    expect(result).toEqual({ success: false, error: "管理者認証が必要です" });
  });

  // G2: 正常作成（戻り値にvariants含む）
  it("商品とバリエーションを正常に作成し、variantsを返す", async () => {
    setupAdmin();
    mockCreateProduct.mockResolvedValue({
      id: "p1",
      name: "早生みかん",
    } as never);
    mockCreateVariant.mockResolvedValue({ id: "v1", label: "3kg" } as never);

    const result = await createProductWithVariantsAction(
      { name: "早生みかん", stockKg: 100 },
      [{ label: "3kg", weightKg: "3", priceJpy: 1800 }]
    );

    expect(result.success).toBe(true);
    expect(mockCreateProduct).toHaveBeenCalled();
    expect(mockCreateVariant).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("variants");
    if (result.success) {
      expect(result.variants).toHaveLength(1);
      expect(result.variants![0]).toMatchObject({ id: "v1", label: "3kg" });
    }
  });
});

describe("updateProductV2Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // G3: 部分更新
  it("name, stockKg, isAvailable の部分更新ができる", async () => {
    setupAdmin();
    mockUpdateProduct.mockResolvedValue(undefined);

    const result = await updateProductV2Action("p1", {
      name: "新名前",
      stockKg: 50,
      isAvailable: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateProduct).toHaveBeenCalledWith("p1", {
      name: "新名前",
      stockKg: 50,
      isAvailable: false,
    });
  });
});

describe("createVariantAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // G5: 正常作成
  it("バリエーションを正常に作成する", async () => {
    setupAdmin();
    mockCreateVariant.mockResolvedValue({ id: "v1" } as never);

    const result = await createVariantAction("p1", {
      label: "5kg",
      weightKg: "5",
      priceJpy: 2800,
    });

    expect(result.success).toBe(true);
    expect(mockCreateVariant).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "p1", label: "5kg" })
    );
  });
});

describe("updateVariantAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // G6: 部分更新
  it("バリエーションの部分更新ができる", async () => {
    setupAdmin();
    mockUpdateVariant.mockResolvedValue(undefined);

    const result = await updateVariantAction("v1", {
      label: "10kg",
      priceJpy: 5000,
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateVariant).toHaveBeenCalledWith("v1", {
      label: "10kg",
      priceJpy: 5000,
    });
  });
});

describe("deleteVariantAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // G7: 最後の1つ → エラー
  it("最後の1つのバリエーションは削除できない", async () => {
    setupAdmin();
    mockCountVariants.mockResolvedValue(1);

    const result = await deleteVariantAction("v1", "p1");

    expect(result).toEqual({
      success: false,
      error: "最低1つのバリエーションが必要です",
    });
    expect(mockDeleteVariant).not.toHaveBeenCalled();
  });

  // G8: 2つ以上ある場合は削除成功
  it("2つ以上ある場合は削除できる", async () => {
    setupAdmin();
    mockCountVariants.mockResolvedValue(2);
    mockDeleteVariant.mockResolvedValue(undefined);

    const result = await deleteVariantAction("v1", "p1");

    expect(result).toEqual({ success: true });
    expect(mockDeleteVariant).toHaveBeenCalledWith("v1");
  });
});
