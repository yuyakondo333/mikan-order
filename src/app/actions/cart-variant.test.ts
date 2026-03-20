import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/dal", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/db/queries/cart", () => ({
  getCartItemByVariant: vi.fn(),
  upsertCartItemByVariant: vi.fn(),
  deleteCartItemByVariant: vi.fn(),
  deleteAllCartItems: vi.fn(),
}));

vi.mock("@/db/queries/products", () => ({
  calcStockConsumptionKg: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      productVariants: { findFirst: vi.fn() },
      products: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/dal";
import {
  getCartItemByVariant,
  upsertCartItemByVariant,
  deleteCartItemByVariant,
} from "@/db/queries/cart";
import { calcStockConsumptionKg } from "@/db/queries/products";
import { db } from "@/db";
import {
  addToCartByVariant,
  updateCartItemByVariant,
  removeCartItemByVariant,
} from "@/app/actions/cart";

const mockGetAuth = vi.mocked(getAuthenticatedUser);
const mockGetCartItemByVariant = vi.mocked(getCartItemByVariant);
const mockUpsertCartItemByVariant = vi.mocked(upsertCartItemByVariant);
const mockDeleteCartItemByVariant = vi.mocked(deleteCartItemByVariant);
const mockCalcConsumption = vi.mocked(calcStockConsumptionKg);

const mockUser = {
  id: "user-1",
  lineUserId: "U1234567890",
  displayName: "テスト",
  pictureUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockVariant = {
  id: "v1",
  productId: "p1",
  label: "3kg",
  weightKg: "3.000",
  priceJpy: 1800,
  isGiftOnly: false,
  displayOrder: 1,
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProduct = {
  id: "p1",
  name: "早生みかん",
  stockKg: "50.000",
  isAvailable: true,
  imageUrl: null,
  description: null,
  variety: "早生",
  weightGrams: 3000,
  priceJpy: 1800,
  stock: 50,
  stockUnit: "kg",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setupAuth() {
  mockGetAuth.mockResolvedValue(mockUser);
}

function setupNoAuth() {
  mockGetAuth.mockResolvedValue(null);
}

function setupVariant(overrides?: Partial<typeof mockVariant>) {
  const v = { ...mockVariant, ...overrides };
  (
    db.query.productVariants.findFirst as ReturnType<typeof vi.fn>
  ).mockResolvedValue(v);
  return v;
}

function setupProduct(overrides?: Partial<typeof mockProduct>) {
  const p = { ...mockProduct, ...overrides };
  (
    db.query.products.findFirst as ReturnType<typeof vi.fn>
  ).mockResolvedValue(p);
  return p;
}

function setupNoVariant() {
  (
    db.query.productVariants.findFirst as ReturnType<typeof vi.fn>
  ).mockResolvedValue(undefined);
}

// =========================================
// addToCartByVariant
// =========================================
describe("addToCartByVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // D1: 未認証 → エラー
  it("未認証でエラーを返す", async () => {
    setupNoAuth();

    const result = await addToCartByVariant("v1", 1);

    expect(result).toEqual({ success: false, error: "認証が必要です" });
  });

  // D2: 存在しないvariantId → エラー
  it("存在しないvariantIdでエラーを返す", async () => {
    setupAuth();
    setupNoVariant();

    const result = await addToCartByVariant("v-nonexistent", 1);

    expect(result).toEqual({
      success: false,
      error: "バリエーションが見つかりません",
    });
  });

  // D3: 販売停止バリエーション → エラー
  it("販売停止バリエーションでエラーを返す", async () => {
    setupAuth();
    setupVariant({ isAvailable: false });

    const result = await addToCartByVariant("v1", 1);

    expect(result).toEqual({
      success: false,
      error: "このバリエーションは現在販売されていません",
    });
  });

  // D4: 販売停止商品のバリエーション → エラー
  it("販売停止商品のバリエーションでエラーを返す", async () => {
    setupAuth();
    setupVariant();
    setupProduct({ isAvailable: false });

    const result = await addToCartByVariant("v1", 1);

    expect(result).toEqual({
      success: false,
      error: "この商品は現在販売されていません",
    });
  });

  // D5: 在庫十分で成功
  it("在庫十分で成功する", async () => {
    setupAuth();
    setupVariant();
    setupProduct({ stockKg: "50.000" });
    mockGetCartItemByVariant.mockResolvedValue(undefined);
    mockCalcConsumption.mockReturnValue(3);
    mockUpsertCartItemByVariant.mockResolvedValue(undefined);

    const result = await addToCartByVariant("v1", 1);

    expect(result).toEqual({ success: true });
    expect(mockUpsertCartItemByVariant).toHaveBeenCalledWith(
      "user-1",
      "v1",
      "p1",
      1
    );
  });

  // D6: 在庫不足で失敗
  it("在庫不足でエラーを返す", async () => {
    setupAuth();
    setupVariant({ weightKg: "10.000" });
    setupProduct({ stockKg: "5.000" });
    mockGetCartItemByVariant.mockResolvedValue(undefined);
    mockCalcConsumption.mockReturnValue(10);

    const result = await addToCartByVariant("v1", 1);

    expect(result).toEqual({ success: false, error: "在庫が不足しています" });
  });

  // D7: 既存カートアイテム（同一variant）あり → 合算で在庫チェック
  it("既存カートアイテムと合算して在庫チェックする", async () => {
    setupAuth();
    setupVariant();
    setupProduct({ stockKg: "50.000" });
    mockGetCartItemByVariant.mockResolvedValue({
      id: "ci-1",
      userId: "user-1",
      productId: "p1",
      variantId: "v1",
      quantity: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    mockCalcConsumption.mockReturnValue(15); // (3+2)*3kg = 15kg
    mockUpsertCartItemByVariant.mockResolvedValue(undefined);

    const result = await addToCartByVariant("v1", 2);

    expect(result).toEqual({ success: true });
    expect(mockUpsertCartItemByVariant).toHaveBeenCalledWith(
      "user-1",
      "v1",
      "p1",
      5
    );
  });

  // D8: quantity < 1 → エラー
  it("quantity < 1 でエラーを返す", async () => {
    setupAuth();

    const result = await addToCartByVariant("v1", 0);

    expect(result).toEqual({
      success: false,
      error: "数量は1以上を指定してください",
    });
  });

  // D12: 同一商品の別バリエーションがそれぞれ別行でカートに入る
  it("同一商品の別バリエーションは別行でカートに入る", async () => {
    setupAuth();
    setupVariant({ id: "v2", productId: "p1", label: "5kg", weightKg: "5.000" });
    setupProduct({ stockKg: "50.000" });
    mockGetCartItemByVariant.mockResolvedValue(undefined); // v2 は未登録
    mockCalcConsumption.mockReturnValue(5);
    mockUpsertCartItemByVariant.mockResolvedValue(undefined);

    const result = await addToCartByVariant("v2", 1);

    expect(result).toEqual({ success: true });
    expect(mockUpsertCartItemByVariant).toHaveBeenCalledWith(
      "user-1",
      "v2",
      "p1",
      1
    );
  });

  // D13: productId 冗長カラムが正しくセットされる
  it("productId 冗長カラムが正しくセットされる", async () => {
    setupAuth();
    setupVariant({ productId: "p1" });
    setupProduct({ id: "p1", stockKg: "50.000" });
    mockGetCartItemByVariant.mockResolvedValue(undefined);
    mockCalcConsumption.mockReturnValue(3);
    mockUpsertCartItemByVariant.mockResolvedValue(undefined);

    await addToCartByVariant("v1", 1);

    // 第3引数が productId
    expect(mockUpsertCartItemByVariant).toHaveBeenCalledWith(
      "user-1",
      "v1",
      "p1",
      1
    );
  });
});

// =========================================
// updateCartItemByVariant
// =========================================
describe("updateCartItemByVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // D9: 在庫十分で成功
  it("在庫十分で数量変更できる", async () => {
    setupAuth();
    setupVariant();
    setupProduct({ stockKg: "50.000" });
    mockCalcConsumption.mockReturnValue(6);
    mockUpsertCartItemByVariant.mockResolvedValue(undefined);

    const result = await updateCartItemByVariant("v1", 2);

    expect(result).toEqual({ success: true });
  });

  // D10: 在庫不足で失敗
  it("在庫不足でエラーを返す", async () => {
    setupAuth();
    setupVariant({ weightKg: "10.000" });
    setupProduct({ stockKg: "5.000" });
    mockCalcConsumption.mockReturnValue(100);

    const result = await updateCartItemByVariant("v1", 10);

    expect(result).toEqual({ success: false, error: "在庫が不足しています" });
  });
});

// =========================================
// removeCartItemByVariant
// =========================================
describe("removeCartItemByVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // D11: 正常削除
  it("カートからバリエーションを削除できる", async () => {
    setupAuth();
    mockDeleteCartItemByVariant.mockResolvedValue(undefined);

    const result = await removeCartItemByVariant("v1");

    expect(result).toEqual({ success: true });
    expect(mockDeleteCartItemByVariant).toHaveBeenCalledWith("user-1", "v1");
  });
});
