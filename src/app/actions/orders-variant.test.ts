import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dal", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/db/queries/cart", () => ({
  getCartWithVariants: vi.fn(),
}));

vi.mock("@/db/queries/products", () => ({
  calcStockConsumptionKg: vi.fn(),
  restoreStockKg: vi.fn(),
}));

vi.mock("@/db/queries/orders", () => ({
  updateOrderStatus: vi.fn(),
  getOrderWithUserAndItemsV2: vi.fn(),
}));

vi.mock("@/db/queries/payment-settings", () => ({
  getPaymentSettings: vi.fn(),
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
vi.mock("@/auth", () => ({ auth: mockAuth }));

import { getAuthenticatedUser } from "@/lib/dal";
import { getCartWithVariants } from "@/db/queries/cart";
import { calcStockConsumptionKg, restoreStockKg } from "@/db/queries/products";
import { getOrderWithUserAndItemsV2 } from "@/db/queries/orders";
import { getPaymentSettings } from "@/db/queries/payment-settings";
import { sendOrderConfirmationWithBankTransfer } from "@/lib/line";
import { db } from "@/db";
import {
  createOrderByVariant,
  updateOrderStatusByVariantAction,
} from "@/app/actions/orders";

const mockGetAuth = vi.mocked(getAuthenticatedUser);
const mockGetCartWithVariants = vi.mocked(getCartWithVariants);
const mockCalcConsumption = vi.mocked(calcStockConsumptionKg);
const mockRestoreStockKg = vi.mocked(restoreStockKg);
const mockGetOrderV2 = vi.mocked(getOrderWithUserAndItemsV2);
const mockGetPaymentSettings = vi.mocked(getPaymentSettings);
const mockSendBankTransfer = vi.mocked(sendOrderConfirmationWithBankTransfer);
const mockDbTransaction = vi.mocked(db.transaction);

const mockUser = {
  id: "user-1",
  lineUserId: "U1234567890",
  displayName: "テスト",
  pictureUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const pickupFulfillment = {
  fulfillmentMethod: "pickup" as const,
  pickupDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  })(),
  pickupTimeSlot: "morning" as const,
};

function makeCartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "ci-1",
    variantId: "v1",
    productId: "p1",
    quantity: 2,
    productName: "早生みかん",
    productImageUrl: null,
    productIsAvailable: true,
    stockKg: 50,
    label: "3kg",
    weightKg: "3.000",
    priceJpy: 1800,
    variantIsAvailable: true,
    isGiftOnly: false,
    updatedAt: new Date(),
    ...overrides,
  };
}

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

// =========================================
// createOrderByVariant
// =========================================
describe("createOrderByVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // E1: 未認証 → エラー
  it("未認証でエラーを返す", async () => {
    mockGetAuth.mockResolvedValue(null);

    const result = await createOrderByVariant(pickupFulfillment);

    expect(result).toEqual({ success: false, error: "認証が必要です" });
  });

  // E2: カート空 → エラー
  it("カート空でエラーを返す", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([]);

    const result = await createOrderByVariant(pickupFulfillment);

    expect(result).toEqual({ success: false, error: "カートが空です" });
  });

  // E3: カート内に販売停止商品 → エラー
  it("販売停止商品でエラーを返す", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([
      makeCartItem({ productIsAvailable: false }),
    ]);

    const result = await createOrderByVariant(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("販売停止");
  });

  // E4: カート内に販売停止バリエーション → エラー
  it("販売停止バリエーションでエラーを返す", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([
      makeCartItem({ variantIsAvailable: false }),
    ]);

    const result = await createOrderByVariant(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("販売停止");
  });

  // E5: 単一バリエーション → 注文成功
  it("単一バリエーションで注文成功する", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([makeCartItem()]);
    mockCalcConsumption.mockReturnValue(6); // 3kg × 2

    mockDbTransaction.mockImplementation(async (callback) => {
      const { tx, mockWhere } = createMockTx();
      mockWhere.mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "p1" }]),
      });
      let insertCall = 0;
      tx.insert = vi.fn().mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
            }),
          };
        }
        return { values: vi.fn().mockResolvedValue(undefined) };
      });
      return callback(tx as never);
    });

    const result = await createOrderByVariant(pickupFulfillment);

    expect(result).toEqual({ success: true, fulfillmentMethod: "pickup" });
  });

  // E7: 個別OKだが合計NG → 注文失敗
  it("同一商品の合計消費kgが在庫を超過でエラー", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([
      makeCartItem({ variantId: "v1", productId: "p1", weightKg: "3.000", quantity: 2, stockKg: 10 }),
      makeCartItem({ variantId: "v2", productId: "p1", weightKg: "5.000", quantity: 1, stockKg: 10 }),
    ]);
    // 個別: 6kg, 5kg → 合計11kg > 在庫10kg
    mockCalcConsumption
      .mockReturnValueOnce(6)  // 3kg×2
      .mockReturnValueOnce(5); // 5kg×1

    const result = await createOrderByVariant(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("在庫");
  });

  // E8: 異なる商品は独立して在庫チェック
  it("異なる商品のバリエーションは独立して在庫チェックする", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([
      makeCartItem({ variantId: "v1", productId: "p1", stockKg: 10, quantity: 2, weightKg: "3.000" }),
      makeCartItem({ variantId: "v3", productId: "p2", stockKg: 20, quantity: 1, weightKg: "5.000" }),
    ]);
    mockCalcConsumption
      .mockReturnValueOnce(6)  // p1: 3kg×2 = 6 ≤ 10
      .mockReturnValueOnce(5); // p2: 5kg×1 = 5 ≤ 20

    mockDbTransaction.mockImplementation(async (callback) => {
      const { tx, mockWhere } = createMockTx();
      mockWhere.mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "p1" }]),
      });
      let insertCall = 0;
      tx.insert = vi.fn().mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
            }),
          };
        }
        return { values: vi.fn().mockResolvedValue(undefined) };
      });
      return callback(tx as never);
    });

    const result = await createOrderByVariant(pickupFulfillment);

    expect(result).toEqual({ success: true, fulfillmentMethod: "pickup" });
  });

  // E9: トランザクション内の在庫減算失敗 → 全ロールバック
  it("トランザクション内の在庫減算失敗でロールバックされる", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([makeCartItem()]);
    mockCalcConsumption.mockReturnValue(6);

    mockDbTransaction.mockImplementation(async (callback) => {
      const { tx, mockWhere } = createMockTx();
      mockWhere.mockReturnValue({
        returning: vi.fn().mockResolvedValue([]), // 在庫減算失敗
      });
      return callback(tx as never);
    });

    const result = await createOrderByVariant(pickupFulfillment);

    expect(result.success).toBe(false);
    expect((result as { error: string }).error).toContain("在庫");
  });

  // delivery注文 + 振込先情報
  const deliveryFulfillment = {
    fulfillmentMethod: "delivery" as const,
    address: {
      recipientName: "テスト太郎",
      postalCode: "100-0001",
      prefecture: "東京都",
      city: "千代田区",
      line1: "千代田1-1-1",
    },
  };

  function setupDeliveryTransaction() {
    mockDbTransaction.mockImplementation(async (callback) => {
      const { tx, mockWhere } = createMockTx();
      mockWhere.mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "p1" }]),
      });
      let insertCall = 0;
      tx.insert = vi.fn().mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "addr-1" }]),
            }),
          };
        }
        if (insertCall === 2) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
            }),
          };
        }
        return { values: vi.fn().mockResolvedValue(undefined) };
      });
      return callback(tx as never);
    });
  }

  it("delivery注文時にpaymentSettingsの振込先情報がLINE通知に渡される", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([makeCartItem()]);
    mockCalcConsumption.mockReturnValue(6);
    mockGetPaymentSettings.mockResolvedValue({
      id: "ps-1",
      bankName: "みかん銀行",
      branchName: "果実支店",
      accountType: "普通",
      accountNumber: "1234567",
      accountHolder: "ミカンノウエン",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setupDeliveryTransaction();

    await createOrderByVariant(deliveryFulfillment);

    expect(mockSendBankTransfer).toHaveBeenCalledWith(
      "U1234567890",
      3600, // 1800 × 2
      {
        bankName: "みかん銀行",
        branchName: "果実支店",
        accountType: "普通",
        accountNumber: "1234567",
        accountHolder: "ミカンノウエン",
      }
    );
  });

  it("paymentSettingsがnullの場合、全フィールドnullのbankInfoでLINE通知する", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([makeCartItem()]);
    mockCalcConsumption.mockReturnValue(6);
    mockGetPaymentSettings.mockResolvedValue(null);
    setupDeliveryTransaction();

    await createOrderByVariant(deliveryFulfillment);

    expect(mockSendBankTransfer).toHaveBeenCalledWith(
      "U1234567890",
      3600,
      {
        bankName: null,
        branchName: null,
        accountType: null,
        accountNumber: null,
        accountHolder: null,
      }
    );
  });

  it("LINE通知失敗時も注文自体は成功する", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([makeCartItem()]);
    mockCalcConsumption.mockReturnValue(6);
    mockGetPaymentSettings.mockResolvedValue(null);
    setupDeliveryTransaction();
    mockSendBankTransfer.mockRejectedValue(new Error("LINE API error"));

    const result = await createOrderByVariant(deliveryFulfillment);

    expect(result).toEqual({ success: true, fulfillmentMethod: "delivery" });
  });

  // E14: 合計金額が variant.priceJpy × quantity の合計で計算される
  it("合計金額が正しく計算される", async () => {
    mockGetAuth.mockResolvedValue(mockUser);
    mockGetCartWithVariants.mockResolvedValue([
      makeCartItem({ priceJpy: 1800, quantity: 2 }),
      makeCartItem({ variantId: "v2", priceJpy: 2800, quantity: 1 }),
    ]);
    mockCalcConsumption.mockReturnValue(6);

    let capturedTotalJpy: number | undefined;
    mockDbTransaction.mockImplementation(async (callback) => {
      const { tx, mockWhere } = createMockTx();
      mockWhere.mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "p1" }]),
      });
      let insertCall = 0;
      tx.insert = vi.fn().mockImplementation(() => {
        insertCall++;
        if (insertCall === 1) {
          return {
            values: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              capturedTotalJpy = data.totalJpy as number;
              return {
                returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
              };
            }),
          };
        }
        return { values: vi.fn().mockResolvedValue(undefined) };
      });
      return callback(tx as never);
    });

    await createOrderByVariant(pickupFulfillment);

    // 1800×2 + 2800×1 = 6400
    expect(capturedTotalJpy).toBe(6400);
  });
});

// =========================================
// updateOrderStatusByVariantAction
// =========================================
describe("updateOrderStatusByVariantAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // F1: 非管理者 → エラー
  it("非管理者でエラーを返す", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateOrderStatusByVariantAction("order-1", "cancelled");

    expect(result).toEqual({ success: false, error: "管理者認証が必要です" });
  });

  // F2: キャンセル → weightKg × quantity が stockKg に加算
  it("キャンセルで在庫が復元される", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "admin", email: "admin@example.com" },
      expires: "",
    } as Session);
    mockGetOrderV2.mockResolvedValue({
      id: "order-1",
      status: "pending",
      fulfillmentMethod: "pickup",
      user: { lineUserId: "U123" },
      items: [
        { productId: "p1", weightKg: "3.000", quantity: 2 },
      ],
    } as never);
    mockRestoreStockKg.mockResolvedValue(undefined);

    const result = await updateOrderStatusByVariantAction("order-1", "cancelled");

    expect(result).toEqual({ success: true });
    expect(mockRestoreStockKg).toHaveBeenCalledWith("p1", 6); // 3kg × 2
  });

  // F5: 商品削除後（productId = NULL）→ 復元スキップ
  it("productIdがnullの場合は復元スキップする", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "admin", email: "admin@example.com" },
      expires: "",
    } as Session);
    mockGetOrderV2.mockResolvedValue({
      id: "order-1",
      status: "pending",
      fulfillmentMethod: "pickup",
      user: { lineUserId: "U123" },
      items: [
        { productId: null, weightKg: "3.000", quantity: 2 },
      ],
    } as never);

    const result = await updateOrderStatusByVariantAction("order-1", "cancelled");

    expect(result).toEqual({ success: true });
    expect(mockRestoreStockKg).not.toHaveBeenCalled();
  });

  // F6: 既にキャンセル済み → 二重復元しない
  it("既にキャンセル済みの注文は二重復元しない", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "admin", email: "admin@example.com" },
      expires: "",
    } as Session);
    mockGetOrderV2.mockResolvedValue({
      id: "order-1",
      status: "cancelled", // 既にキャンセル済み
      fulfillmentMethod: "pickup",
      user: { lineUserId: "U123" },
      items: [
        { productId: "p1", weightKg: "3.000", quantity: 2 },
      ],
    } as never);

    const result = await updateOrderStatusByVariantAction("order-1", "cancelled");

    expect(result).toEqual({ success: true });
    expect(mockRestoreStockKg).not.toHaveBeenCalled();
  });

  // F8: 同一商品の複数バリエーション → 合計復元
  it("複数バリエーションのキャンセルで合計kgが復元される", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "admin", email: "admin@example.com" },
      expires: "",
    } as Session);
    mockGetOrderV2.mockResolvedValue({
      id: "order-1",
      status: "pending",
      fulfillmentMethod: "pickup",
      user: { lineUserId: "U123" },
      items: [
        { productId: "p1", weightKg: "3.000", quantity: 2 },
        { productId: "p1", weightKg: "5.000", quantity: 1 },
      ],
    } as never);
    mockRestoreStockKg.mockResolvedValue(undefined);

    const result = await updateOrderStatusByVariantAction("order-1", "cancelled");

    expect(result).toEqual({ success: true });
    // 3×2=6 and 5×1=5, called separately per item
    expect(mockRestoreStockKg).toHaveBeenCalledTimes(2);
    expect(mockRestoreStockKg).toHaveBeenCalledWith("p1", 6);
    expect(mockRestoreStockKg).toHaveBeenCalledWith("p1", 5);
  });
});
