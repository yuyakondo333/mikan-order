import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

// server-only モック（テスト環境用）
vi.mock("server-only", () => ({}));

// モック定義
vi.mock("@/lib/dal", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/db/queries/cart", () => ({
  getCartWithProducts: vi.fn(),
}));

vi.mock("@/db/queries/products", () => ({
  calcStockConsumption: vi.fn(),
  restoreStock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(),
    query: { products: { findFirst: vi.fn() } },
  },
}));

vi.mock("@/lib/line", () => ({
  sendOrderConfirmationWithPickup: vi.fn(),
  sendOrderConfirmationWithBankTransfer: vi.fn(),
  sendPickupReadyNotification: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn<() => Promise<Session | null>>(),
}));
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

import { getAuthenticatedUser } from "@/lib/dal";
import { getCartWithProducts } from "@/db/queries/cart";
import { calcStockConsumption } from "@/db/queries/products";
import { db } from "@/db";
import { createOrder, updateOrderStatusAction } from "@/app/actions/orders";

const mockGetAuthenticatedUser = vi.mocked(getAuthenticatedUser);
const mockGetCartWithProducts = vi.mocked(getCartWithProducts);
const mockCalcStockConsumption = vi.mocked(calcStockConsumption);
const mockDbTransaction = vi.mocked(db.transaction);

const mockUser = {
  id: "user-1",
  lineUserId: "U1234567890",
  displayName: "テストユーザー",
  pictureUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCartItems = [
  {
    id: "cart-1",
    userId: "user-1",
    productId: "product-1",
    quantity: 2,
    name: "温州みかん",
    variety: "青島",
    weightGrams: 3000,
    priceJpy: 3000,
    imageUrl: null,
    stock: 10,
    stockUnit: "kg",
    isAvailable: true,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const pickupFulfillment = {
  fulfillmentMethod: "pickup" as const,
  pickupDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  })(),
  pickupTimeSlot: "morning" as const,
};

const deliveryFulfillment = {
  fulfillmentMethod: "delivery" as const,
  address: {
    recipientName: "山田太郎",
    postalCode: "790-0001",
    prefecture: "愛媛県",
    city: "松山市",
    line1: "1-2-3",
    line2: "",
  },
};

function createMockTx() {
  const mockWhere = vi.fn();
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);

  return {
    tx: {
      update: vi.fn().mockReturnValue({ set: mockSet }),
      insert: vi.fn().mockReturnValue({ values: mockValues }),
      delete: vi.fn().mockReturnValue({ where: mockDeleteWhere }),
    },
    mockWhere,
    mockReturning,
    mockValues,
  };
}

describe("createOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証ユーザーはエラーを返す", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const result = await createOrder(pickupFulfillment);

    expect(result).toEqual({ success: false, error: "認証が必要です" });
  });

  it("不正なfulfillmentデータはバリデーションエラーを返す", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const result = await createOrder({
      fulfillmentMethod: "invalid" as never,
    });

    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  it("カートが空の場合はエラーを返す", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue([]);

    const result = await createOrder(pickupFulfillment);

    expect(result).toEqual({ success: false, error: "カートが空です" });
  });

  it("販売停止商品がある場合はエラーを返す", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue([
      { ...mockCartItems[0], isAvailable: false },
    ]);

    const result = await createOrder(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("販売停止");
  });

  it("在庫不足の場合はエラーを返す（事前チェック）", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(100); // 在庫10に対して100必要

    const result = await createOrder(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("在庫");
    // トランザクションが呼ばれないことを確認
    expect(mockDbTransaction).not.toHaveBeenCalled();
  });

  it("トランザクション内で在庫減算が失敗した場合はロールバックされる", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(6);

    // トランザクション内で在庫減算が空配列を返す
    mockDbTransaction.mockImplementation(async (callback) => {
      const { tx, mockWhere } = createMockTx();
      mockWhere.mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
      return callback(tx as never);
    });

    const result = await createOrder(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("在庫");
  });

  it("取り置き注文を正常に作成できる", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(6);

    mockDbTransaction.mockImplementation(async (callback) => {
      const { tx, mockWhere, mockReturning, mockValues } = createMockTx();
      // deductStock 成功
      mockWhere.mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "product-1" }]),
      });
      // orders insert
      let insertCall = 0;
      tx.insert = vi.fn().mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) {
          // orders
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
            }),
          };
        }
        // orderItems
        return { values: vi.fn().mockResolvedValue(undefined) };
      });

      return callback(tx as never);
    });

    const result = await createOrder(pickupFulfillment);

    expect(result).toEqual({
      success: true,
      fulfillmentMethod: "pickup",
    });
    expect(mockDbTransaction).toHaveBeenCalled();
  });

  it("配送注文を正常に作成できる（住所も保存される）", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(6);

    mockDbTransaction.mockImplementation(async (callback) => {
      const { tx, mockWhere } = createMockTx();
      // deductStock 成功
      mockWhere.mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "product-1" }]),
      });
      // insert: address → order → orderItems → delete cart
      let insertCall = 0;
      tx.insert = vi.fn().mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) {
          // addresses
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "address-1" }]),
            }),
          };
        }
        if (insertCall === 2) {
          // orders
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
            }),
          };
        }
        // orderItems
        return { values: vi.fn().mockResolvedValue(undefined) };
      });

      return callback(tx as never);
    });

    const result = await createOrder(deliveryFulfillment);

    expect(result).toEqual({
      success: true,
      fulfillmentMethod: "delivery",
    });
    expect(mockDbTransaction).toHaveBeenCalled();
  });
});

describe("updateOrderStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("管理者セッションがない場合はエラーを返す", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateOrderStatusAction("order-1", "preparing");

    expect(result).toEqual({
      success: false,
      error: "管理者認証が必要です",
    });
  });

  it("customerロールではエラーを返す", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "customer", lineUserId: "U123", displayName: "test" },
      expires: "",
    } as Session);

    const result = await updateOrderStatusAction("order-1", "preparing");

    expect(result).toEqual({
      success: false,
      error: "管理者認証が必要です",
    });
  });
});
