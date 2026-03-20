import { describe, it, expect, vi, beforeEach } from "vitest";

// server-only モック（テスト環境用）
vi.mock("server-only", () => ({}));

// モック定義
vi.mock("@/lib/dal", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/db/queries/cart", () => ({
  getCartWithProducts: vi.fn(),
  deleteAllCartItems: vi.fn(),
}));

vi.mock("@/db/queries/products", () => ({
  calcStockConsumption: vi.fn(),
  deductStock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/line", () => ({
  sendOrderConfirmationWithPickup: vi.fn(),
  sendOrderConfirmationWithBankTransfer: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/dal";
import {
  getCartWithProducts,
  deleteAllCartItems,
} from "@/db/queries/cart";
import { calcStockConsumption, deductStock } from "@/db/queries/products";
import { db } from "@/db";
import { createOrder } from "@/app/actions/orders";

const mockGetAuthenticatedUser = vi.mocked(getAuthenticatedUser);
const mockGetCartWithProducts = vi.mocked(getCartWithProducts);
const mockDeleteAllCartItems = vi.mocked(deleteAllCartItems);
const mockCalcStockConsumption = vi.mocked(calcStockConsumption);
const mockDeductStock = vi.mocked(deductStock);
const mockDbInsert = vi.mocked(db.insert);

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

function setupInsertChain(returnValue: unknown) {
  const returning = vi.fn().mockResolvedValue([returnValue]);
  const values = vi.fn().mockReturnValue({ returning });
  mockDbInsert.mockReturnValue({ values } as never);
  return { values, returning };
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

  it("在庫不足の場合はエラーを返す", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(100); // 在庫10に対して100必要

    const result = await createOrder(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("在庫");
  });

  it("在庫の原子的減算が失敗した場合はエラーを返す", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(6);
    mockDeductStock.mockResolvedValue([]); // 減算失敗

    const result = await createOrder(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("在庫");
  });

  it("取り置き注文を正常に作成できる", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(6);
    mockDeductStock.mockResolvedValue([{ id: "product-1" }]);

    // order insert
    const orderInsert = setupInsertChain({ id: "order-1" });
    // orderItems insert (returning不要)
    let insertCallCount = 0;
    mockDbInsert.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) {
        // orders insert
        return orderInsert.values as never;
      }
      // orderItems insert
      return {
        values: vi.fn().mockReturnValue(undefined),
      } as never;
    });

    // Re-setup for clean mock
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(6);
    mockDeductStock.mockResolvedValue([{ id: "product-1" }]);

    const orderReturning = vi.fn().mockResolvedValue([{ id: "order-1" }]);
    const orderValues = vi.fn().mockReturnValue({ returning: orderReturning });
    const itemsValues = vi.fn().mockResolvedValue(undefined);

    let callIndex = 0;
    mockDbInsert.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return { values: orderValues } as never;
      }
      return { values: itemsValues } as never;
    });

    const result = await createOrder(pickupFulfillment);

    expect(result).toEqual({
      success: true,
      fulfillmentMethod: "pickup",
    });
    expect(mockDeleteAllCartItems).toHaveBeenCalledWith("user-1");
  });

  it("配送注文を正常に作成できる（住所も保存される）", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetCartWithProducts.mockResolvedValue(mockCartItems);
    mockCalcStockConsumption.mockReturnValue(6);
    mockDeductStock.mockResolvedValue([{ id: "product-1" }]);

    const addressReturning = vi
      .fn()
      .mockResolvedValue([{ id: "address-1" }]);
    const addressValues = vi
      .fn()
      .mockReturnValue({ returning: addressReturning });
    const orderReturning = vi
      .fn()
      .mockResolvedValue([{ id: "order-1" }]);
    const orderValues = vi
      .fn()
      .mockReturnValue({ returning: orderReturning });
    const itemsValues = vi.fn().mockResolvedValue(undefined);

    let callIndex = 0;
    mockDbInsert.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // addresses insert
        return { values: addressValues } as never;
      }
      if (callIndex === 2) {
        // orders insert
        return { values: orderValues } as never;
      }
      // orderItems insert
      return { values: itemsValues } as never;
    });

    const result = await createOrder(deliveryFulfillment);

    expect(result).toEqual({
      success: true,
      fulfillmentMethod: "delivery",
    });
    expect(mockDeleteAllCartItems).toHaveBeenCalledWith("user-1");
  });
});
