import { describe, it, expect, vi, beforeEach } from "vitest";

// モック定義（実装ファイルより先に宣言）
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db/queries/users", () => ({
  upsertUser: vi.fn(),
}));

vi.mock("@/db/queries/cart", () => ({
  getCartItem: vi.fn(),
  upsertCartItem: vi.fn(),
  deleteCartItem: vi.fn(),
  deleteAllCartItems: vi.fn(),
}));

vi.mock("@/db/queries/products", () => ({
  calcStockConsumption: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    query: { products: { findFirst: vi.fn() } },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import { upsertUser } from "@/db/queries/users";
import {
  getCartItem,
  upsertCartItem,
  deleteCartItem,
  deleteAllCartItems,
} from "@/db/queries/cart";
import { calcStockConsumption } from "@/db/queries/products";
import { db } from "@/db";
import {
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
} from "@/app/actions/cart";

const mockAuth = vi.mocked(auth);
const mockUpsertUser = vi.mocked(upsertUser);
const mockGetCartItem = vi.mocked(getCartItem);
const mockUpsertCartItem = vi.mocked(upsertCartItem);
const mockDeleteCartItem = vi.mocked(deleteCartItem);
const mockDeleteAllCartItems = vi.mocked(deleteAllCartItems);
const mockCalcStockConsumption = vi.mocked(calcStockConsumption);

const mockProduct = {
  id: "product-1",
  name: "みかん青島",
  variety: "青島",
  weightGrams: 500,
  priceJpy: 1500,
  imageUrl: null,
  stock: 10,
  stockUnit: "kg",
  isAvailable: true,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  id: "user-1",
  lineUserId: "U1234567890",
  displayName: "テストユーザー",
  pictureUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ヘルパー
function setupAuthenticatedSession() {
  mockAuth.mockResolvedValue({
    user: {
      lineUserId: "U1234567890",
      displayName: "テストユーザー",
      pictureUrl: null,
    },
    expires: "",
  } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
  mockUpsertUser.mockResolvedValue(mockUser);
}

function setupUnauthenticatedSession() {
  mockAuth.mockResolvedValue(null as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
}

function setupProduct(overrides?: Partial<typeof mockProduct>) {
  const product = { ...mockProduct, ...overrides };
  (db.query.products.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
    product
  );
  return product;
}

function setupNoProduct() {
  (db.query.products.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
    undefined
  );
}

function mockCartItem(overrides?: Partial<{ quantity: number }>) {
  return {
    id: "cart-item-1",
    userId: "user-1",
    productId: "product-1",
    quantity: overrides?.quantity ?? 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// =========================================
// addToCart
// =========================================
describe("addToCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // #1: 新規商品をカートに追加
  it("新規商品をカートに追加できる", async () => {
    setupAuthenticatedSession();
    setupProduct();
    mockGetCartItem.mockResolvedValue(undefined);
    mockCalcStockConsumption.mockReturnValue(1.0);
    mockUpsertCartItem.mockResolvedValue(undefined);

    const result = await addToCart("product-1", 2);

    expect(result).toEqual({ success: true });
    expect(mockUpsertCartItem).toHaveBeenCalledWith("user-1", "product-1", 2);
  });

  // #2: 既存商品を追加すると数量が加算される
  it("既存商品を追加すると数量が加算される（qty=3 + add=2 → 5）", async () => {
    setupAuthenticatedSession();
    setupProduct();
    mockGetCartItem.mockResolvedValue(mockCartItem({ quantity: 3 }));
    mockCalcStockConsumption.mockReturnValue(2.5);
    mockUpsertCartItem.mockResolvedValue(undefined);

    const result = await addToCart("product-1", 2);

    expect(result).toEqual({ success: true });
    expect(mockUpsertCartItem).toHaveBeenCalledWith("user-1", "product-1", 5);
  });

  // #8: 在庫チェック（kg単位）成功
  it("在庫チェック（kg単位）: 在庫内なら成功", async () => {
    setupAuthenticatedSession();
    setupProduct({ stock: 10, stockUnit: "kg", weightGrams: 500 });
    mockGetCartItem.mockResolvedValue(undefined);
    mockCalcStockConsumption.mockReturnValue(2.5); // 5 * 500g / 1000
    mockUpsertCartItem.mockResolvedValue(undefined);

    const result = await addToCart("product-1", 5);

    expect(result).toEqual({ success: true });
    expect(mockCalcStockConsumption).toHaveBeenCalledWith(5, 500, "kg");
  });

  // #9: 在庫チェック（個単位）成功
  it("在庫チェック（個単位）: 在庫内なら成功", async () => {
    setupAuthenticatedSession();
    setupProduct({ stock: 10, stockUnit: "個", weightGrams: 1000 });
    mockGetCartItem.mockResolvedValue(undefined);
    mockCalcStockConsumption.mockReturnValue(3); // qty=3, 個単位
    mockUpsertCartItem.mockResolvedValue(undefined);

    const result = await addToCart("product-1", 3);

    expect(result).toEqual({ success: true });
    expect(mockCalcStockConsumption).toHaveBeenCalledWith(3, 1000, "個");
  });

  // #14: 認証なしでaddToCart → エラー
  it("認証なしでエラーを返す", async () => {
    setupUnauthenticatedSession();

    const result = await addToCart("product-1", 1);

    expect(result).toEqual({ success: false, error: "認証が必要です" });
    expect(mockUpsertCartItem).not.toHaveBeenCalled();
  });

  // #18: 在庫超過でaddToCart → エラー
  it("在庫超過でエラーを返す（stock=10, カート8, 追加5）", async () => {
    setupAuthenticatedSession();
    setupProduct({ stock: 10 });
    mockGetCartItem.mockResolvedValue(mockCartItem({ quantity: 8 }));
    mockCalcStockConsumption.mockReturnValue(11); // 超過

    const result = await addToCart("product-1", 5);

    expect(result).toEqual({ success: false, error: "在庫が不足しています" });
    expect(mockUpsertCartItem).not.toHaveBeenCalled();
  });

  // #20: 存在しない商品IDでaddToCart → エラー
  it("存在しない商品でエラーを返す", async () => {
    setupAuthenticatedSession();
    setupNoProduct();

    const result = await addToCart("nonexistent", 1);

    expect(result).toEqual({ success: false, error: "商品が見つかりません" });
  });

  // #21: 販売停止商品でaddToCart → エラー
  it("販売停止商品でエラーを返す", async () => {
    setupAuthenticatedSession();
    setupProduct({ isAvailable: false });

    const result = await addToCart("product-1", 1);

    expect(result).toEqual({
      success: false,
      error: "この商品は現在販売されていません",
    });
  });

  // #24: 数量に0を指定 → バリデーションエラー
  it("数量0でエラーを返す", async () => {
    setupAuthenticatedSession();

    const result = await addToCart("product-1", 0);

    expect(result).toEqual({
      success: false,
      error: "数量は1以上を指定してください",
    });
  });

  // #25: 数量に負数を指定 → バリデーションエラー
  it("数量が負数でエラーを返す", async () => {
    setupAuthenticatedSession();

    const result = await addToCart("product-1", -1);

    expect(result).toEqual({
      success: false,
      error: "数量は1以上を指定してください",
    });
  });

  // #29: 在庫ちょうどの追加 → 成功
  it("在庫ちょうどの追加は成功する（stock=10, 消費量=10）", async () => {
    setupAuthenticatedSession();
    setupProduct({ stock: 10 });
    mockGetCartItem.mockResolvedValue(undefined);
    mockCalcStockConsumption.mockReturnValue(10); // ちょうど
    mockUpsertCartItem.mockResolvedValue(undefined);

    const result = await addToCart("product-1", 20);

    expect(result).toEqual({ success: true });
  });

  // #30: 在庫を1超過する追加 → エラー
  it("在庫を1超過する追加はエラー（stock=10, 消費量=11）", async () => {
    setupAuthenticatedSession();
    setupProduct({ stock: 10 });
    mockGetCartItem.mockResolvedValue(undefined);
    mockCalcStockConsumption.mockReturnValue(11);

    const result = await addToCart("product-1", 22);

    expect(result).toEqual({ success: false, error: "在庫が不足しています" });
  });

  // #31: quantity=1（最小値）→ 成功
  it("quantity=1（最小値）で成功する", async () => {
    setupAuthenticatedSession();
    setupProduct();
    mockGetCartItem.mockResolvedValue(undefined);
    mockCalcStockConsumption.mockReturnValue(0.5);
    mockUpsertCartItem.mockResolvedValue(undefined);

    const result = await addToCart("product-1", 1);

    expect(result).toEqual({ success: true });
    expect(mockUpsertCartItem).toHaveBeenCalledWith("user-1", "product-1", 1);
  });
});

// =========================================
// updateCartItemQuantity
// =========================================
describe("updateCartItemQuantity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // #3: 数量を変更できる
  it("数量を変更できる", async () => {
    setupAuthenticatedSession();
    setupProduct();
    mockCalcStockConsumption.mockReturnValue(5.0);
    mockUpsertCartItem.mockResolvedValue(undefined);

    const result = await updateCartItemQuantity("product-1", 10);

    expect(result).toEqual({ success: true });
    expect(mockUpsertCartItem).toHaveBeenCalledWith("user-1", "product-1", 10);
  });

  // #17: 認証なしでエラー
  it("認証なしでエラーを返す", async () => {
    setupUnauthenticatedSession();

    const result = await updateCartItemQuantity("product-1", 5);

    expect(result).toEqual({ success: false, error: "認証が必要です" });
  });

  // #19: 在庫超過でエラー
  it("在庫超過でエラーを返す", async () => {
    setupAuthenticatedSession();
    setupProduct({ stock: 10 });
    mockCalcStockConsumption.mockReturnValue(15);

    const result = await updateCartItemQuantity("product-1", 30);

    expect(result).toEqual({ success: false, error: "在庫が不足しています" });
    expect(mockUpsertCartItem).not.toHaveBeenCalled();
  });

  // #24: 数量0 → エラー
  it("数量0でエラーを返す", async () => {
    setupAuthenticatedSession();

    const result = await updateCartItemQuantity("product-1", 0);

    expect(result).toEqual({
      success: false,
      error: "数量は1以上を指定してください",
    });
  });

  // #25: 数量負数 → エラー
  it("数量が負数でエラーを返す", async () => {
    setupAuthenticatedSession();

    const result = await updateCartItemQuantity("product-1", -1);

    expect(result).toEqual({
      success: false,
      error: "数量は1以上を指定してください",
    });
  });
});

// =========================================
// removeFromCart
// =========================================
describe("removeFromCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // #4: カートから商品を削除できる
  it("カートから商品を削除できる", async () => {
    setupAuthenticatedSession();
    mockDeleteCartItem.mockResolvedValue(undefined);

    const result = await removeFromCart("product-1");

    expect(result).toEqual({ success: true });
    expect(mockDeleteCartItem).toHaveBeenCalledWith("user-1", "product-1");
  });

  // #14相当: 認証なしでエラー
  it("認証なしでエラーを返す", async () => {
    setupUnauthenticatedSession();

    const result = await removeFromCart("product-1");

    expect(result).toEqual({ success: false, error: "認証が必要です" });
  });
});

// =========================================
// clearCart
// =========================================
describe("clearCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // #5: カートを全削除できる
  it("カートを全削除できる", async () => {
    setupAuthenticatedSession();
    mockDeleteAllCartItems.mockResolvedValue(undefined);

    const result = await clearCart();

    expect(result).toEqual({ success: true });
    expect(mockDeleteAllCartItems).toHaveBeenCalledWith("user-1");
  });

  // #17: 認証なしでエラー
  it("認証なしでエラーを返す", async () => {
    setupUnauthenticatedSession();

    const result = await clearCart();

    expect(result).toEqual({ success: false, error: "認証が必要です" });
  });
});
