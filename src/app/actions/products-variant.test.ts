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

const { mockAuth, mockCheckRateLimit } = vi.hoisted(() => ({
  mockAuth: vi.fn<() => Promise<Session | null>>(),
  mockCheckRateLimit: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  adminLimiter: "admin-limiter",
}));

import { createProduct, updateProduct, deleteProduct } from "@/db/queries/products";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  countVariantsByProductId,
} from "@/db/queries/variants";
import {
  deleteProductAction,
  createProductWithVariantsAction,
  updateProductV2Action,
  toggleProductAvailabilityAction,
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

// テスト用UUID定数
const PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440000";
const VARIANT_ID = "660e8400-e29b-41d4-a716-446655440001";

function setupAdmin() {
  mockAuth.mockResolvedValue({
    user: { role: "admin", email: "admin@example.com" },
    expires: "",
  } as Session);
}

function setupNoAdmin() {
  mockAuth.mockResolvedValue(null);
}

describe("deleteProductAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("非管理者でエラーを返す", async () => {
    setupNoAdmin();

    const result = await deleteProductAction(PRODUCT_ID);

    expect(result).toEqual({ success: false, error: "管理者認証が必要です" });
    expect(mockDeleteProduct).not.toHaveBeenCalled();
  });

  it("正常なUUIDで商品を削除できる", async () => {
    setupAdmin();
    mockDeleteProduct.mockResolvedValue(undefined);

    const result = await deleteProductAction(PRODUCT_ID);

    expect(result).toEqual({ success: true });
    expect(mockDeleteProduct).toHaveBeenCalledWith(PRODUCT_ID);
  });

  it("不正なUUIDでバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await deleteProductAction("not-a-uuid");

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockDeleteProduct).not.toHaveBeenCalled();
  });
});

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
      id: PRODUCT_ID,
      name: "早生みかん",
    } as never);
    mockCreateVariant.mockResolvedValue({ id: VARIANT_ID, label: "3kg" } as never);

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
      expect(result.variants![0]).toMatchObject({ id: VARIANT_ID, label: "3kg" });
    }
  });

  it("variants空配列でisAvailable=trueを指定しても強制的にfalseで作成される", async () => {
    setupAdmin();
    mockCreateProduct.mockResolvedValue({
      id: PRODUCT_ID,
      name: "test",
    } as never);

    const result = await createProductWithVariantsAction(
      { name: "test", isAvailable: true },
      []
    );

    expect(result.success).toBe(true);
    expect(mockCreateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ isAvailable: false })
    );
  });

  it("productDataのnameが空文字でバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await createProductWithVariantsAction(
      { name: "", stockKg: 10 },
      [{ label: "3kg", weightKg: "3", priceJpy: 1800 }]
    );

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });

  it("variantsが配列でない場合バリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await createProductWithVariantsAction(
      { name: "test", stockKg: 10 },
      "not-array" as unknown as never[]
    );

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });

  it("variants内のweightKgが不正値でバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await createProductWithVariantsAction(
      { name: "test", stockKg: 10 },
      [{ label: "3kg", weightKg: "-1", priceJpy: 1800 }]
    );

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });

  it("productDataがnullでバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await createProductWithVariantsAction(
      null as never,
      [{ label: "3kg", weightKg: "3", priceJpy: 1800 }]
    );

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockCreateProduct).not.toHaveBeenCalled();
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

    const result = await updateProductV2Action(PRODUCT_ID, {
      name: "新名前",
      stockKg: 50,
      isAvailable: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateProduct).toHaveBeenCalledWith(PRODUCT_ID, {
      name: "新名前",
      stockKg: 50,
      isAvailable: false,
    });
  });

  it("バリエーション0件の商品をisAvailable=trueで更新するとエラーを返す", async () => {
    setupAdmin();
    mockCountVariants.mockResolvedValue(0);

    const result = await updateProductV2Action(PRODUCT_ID, { isAvailable: true });

    expect(result).toEqual({
      success: false,
      error: "バリエーションがない商品は公開できません",
    });
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });

  it("バリエーション0件でもisAvailableを含まない更新は成功する", async () => {
    setupAdmin();
    mockUpdateProduct.mockResolvedValue(undefined);

    const result = await updateProductV2Action(PRODUCT_ID, { name: "新名前" });

    expect(result).toEqual({ success: true });
    expect(mockCountVariants).not.toHaveBeenCalled();
  });

  it("バリエーション1件以上の商品はisAvailable=trueで更新できる", async () => {
    setupAdmin();
    mockCountVariants.mockResolvedValue(3);
    mockUpdateProduct.mockResolvedValue(undefined);

    const result = await updateProductV2Action(PRODUCT_ID, { isAvailable: true });

    expect(result).toEqual({ success: true });
    expect(mockUpdateProduct).toHaveBeenCalled();
  });

  it("不正なUUIDでバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await updateProductV2Action("invalid", { name: "新名前" });

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });

  it("stockKgが負数でバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await updateProductV2Action(PRODUCT_ID, { stockKg: -1 });

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });

  it("空オブジェクトでの更新は成功する（partial許容）", async () => {
    setupAdmin();
    mockUpdateProduct.mockResolvedValue(undefined);

    const result = await updateProductV2Action(PRODUCT_ID, {});

    expect(result).toEqual({ success: true });
    expect(mockUpdateProduct).toHaveBeenCalledWith(PRODUCT_ID, {});
  });

  it("想定外フィールドがstripされDB層に渡らない", async () => {
    setupAdmin();
    mockUpdateProduct.mockResolvedValue(undefined);

    const result = await updateProductV2Action(PRODUCT_ID, {
      name: "新名前",
      id: "hacked",
      createdAt: "2024-01-01",
    } as never);

    expect(result).toEqual({ success: true });
    expect(mockUpdateProduct).toHaveBeenCalledWith(PRODUCT_ID, {
      name: "新名前",
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
    mockCreateVariant.mockResolvedValue({ id: VARIANT_ID } as never);

    const result = await createVariantAction(PRODUCT_ID, {
      label: "5kg",
      weightKg: "5",
      priceJpy: 2800,
    });

    expect(result.success).toBe(true);
    expect(mockCreateVariant).toHaveBeenCalledWith(
      expect.objectContaining({ productId: PRODUCT_ID, label: "5kg" })
    );
  });

  it("不正なUUIDでバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await createVariantAction("invalid", {
      label: "5kg",
      weightKg: "5",
      priceJpy: 2800,
    });

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockCreateVariant).not.toHaveBeenCalled();
  });

  it("labelが空文字でバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await createVariantAction(PRODUCT_ID, {
      label: "",
      weightKg: "5",
      priceJpy: 2800,
    });

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockCreateVariant).not.toHaveBeenCalled();
  });

  it("weightKgが数値でない文字列でバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await createVariantAction(PRODUCT_ID, {
      label: "5kg",
      weightKg: "abc",
      priceJpy: 2800,
    });

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockCreateVariant).not.toHaveBeenCalled();
  });

  it("weightKgが'0'でバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await createVariantAction(PRODUCT_ID, {
      label: "5kg",
      weightKg: "0",
      priceJpy: 2800,
    });

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockCreateVariant).not.toHaveBeenCalled();
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

    const result = await updateVariantAction(VARIANT_ID, {
      label: "10kg",
      priceJpy: 5000,
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateVariant).toHaveBeenCalledWith(VARIANT_ID, {
      label: "10kg",
      priceJpy: 5000,
    });
  });

  it("不正なUUIDでバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await updateVariantAction("invalid", {
      label: "10kg",
      priceJpy: 5000,
    });

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockUpdateVariant).not.toHaveBeenCalled();
  });

  it("空オブジェクトでの更新は成功する（partial許容）", async () => {
    setupAdmin();
    mockUpdateVariant.mockResolvedValue(undefined);

    const result = await updateVariantAction(VARIANT_ID, {});

    expect(result).toEqual({ success: true });
    expect(mockUpdateVariant).toHaveBeenCalledWith(VARIANT_ID, {});
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

    const result = await deleteVariantAction(VARIANT_ID, PRODUCT_ID);

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

    const result = await deleteVariantAction(VARIANT_ID, PRODUCT_ID);

    expect(result).toEqual({ success: true });
    expect(mockDeleteVariant).toHaveBeenCalledWith(VARIANT_ID);
  });

  it("variantIdが不正UUIDでバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await deleteVariantAction("not-uuid", PRODUCT_ID);

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockDeleteVariant).not.toHaveBeenCalled();
    expect(mockCountVariants).not.toHaveBeenCalled();
  });

  it("productIdが不正UUIDでバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await deleteVariantAction(VARIANT_ID, "not-uuid");

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockDeleteVariant).not.toHaveBeenCalled();
    expect(mockCountVariants).not.toHaveBeenCalled();
  });
});

describe("toggleProductAvailabilityAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("バリエーション0件の商品を公開しようとするとエラーを返す", async () => {
    setupAdmin();
    mockCountVariants.mockResolvedValue(0);

    const result = await toggleProductAvailabilityAction(PRODUCT_ID, true);

    expect(result).toEqual({
      success: false,
      error: "バリエーションがない商品は公開できません",
    });
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });

  it("バリエーション1件以上の商品を公開できる", async () => {
    setupAdmin();
    mockCountVariants.mockResolvedValue(2);
    mockUpdateProduct.mockResolvedValue(undefined);

    const result = await toggleProductAvailabilityAction(PRODUCT_ID, true);

    expect(result).toEqual({ success: true });
    expect(mockUpdateProduct).toHaveBeenCalledWith(PRODUCT_ID, { isAvailable: true });
  });

  it("非公開にする場合はバリエーション数を問わず成功する", async () => {
    setupAdmin();
    mockUpdateProduct.mockResolvedValue(undefined);

    const result = await toggleProductAvailabilityAction(PRODUCT_ID, false);

    expect(result).toEqual({ success: true });
    expect(mockCountVariants).not.toHaveBeenCalled();
  });

  it("不正なUUIDでバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await toggleProductAvailabilityAction("invalid", true);

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });

  it("isAvailableが文字列でバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await toggleProductAvailabilityAction(
      PRODUCT_ID,
      "true" as unknown as boolean
    );

    expect(result).toEqual({ success: false, error: "入力内容に誤りがあります" });
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });
});

// =========================================
// レート制限
// =========================================
describe("管理操作レート制限", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(null);
  });

  it("deleteProductAction: レート制限超過でエラーを返す", async () => {
    setupAdmin();
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      error: "リクエストが多すぎます。しばらくしてから再度お試しください",
    });

    const result = await deleteProductAction(PRODUCT_ID);

    expect(result).toEqual({
      success: false,
      error: "リクエストが多すぎます。しばらくしてから再度お試しください",
    });
    expect(mockCheckRateLimit).toHaveBeenCalledWith("admin-limiter", "admin@example.com");
    expect(mockDeleteProduct).not.toHaveBeenCalled();
  });
});
