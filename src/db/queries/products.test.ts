import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// DB mock
const mockReturning = vi.fn();
const mockWhere = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
const mockFindMany = vi.fn();

vi.mock("@/db", () => ({
  db: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (...args: unknown[]) => (mockUpdate as any)(...args),
    query: {
      products: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
  },
}));

vi.mock("@/db/schema", async () => {
  const actual = await vi.importActual("@/db/schema");
  return actual;
});

import {
  calcStockConsumptionKg,
  deductStockKg,
  restoreStockKg,
  getAvailableProductsWithVariants,
} from "./products";

describe("calcStockConsumptionKg", () => {
  // B1: 整数重量 × 整数数量（3kg × 2 = 6）
  it("整数重量 × 整数数量で正しく計算する（3kg × 2 = 6）", () => {
    expect(calcStockConsumptionKg(2, "3")).toBe(6);
  });

  // B2: 小数重量 × 整数数量（0.5kg × 3 = 1.5）
  it("小数重量 × 整数数量で正しく計算する（0.5kg × 3 = 1.5）", () => {
    expect(calcStockConsumptionKg(3, "0.5")).toBe(1.5);
  });

  // B3: weightKg が string "3.000" で渡される → 正しく変換
  it('weightKg が "3.000" で渡されても正しく計算する', () => {
    expect(calcStockConsumptionKg(2, "3.000")).toBe(6);
  });

  // B4: quantity が 0 → 消費量 0
  it("quantity が 0 の場合消費量 0 を返す", () => {
    expect(calcStockConsumptionKg(0, "5")).toBe(0);
  });
});

describe("deductStockKg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // C1: 在庫十分 → 減算成功、返り値あり
  it("在庫十分で減算成功し、返り値を返す", async () => {
    const updated = { id: "p1", stockKg: 44 };
    mockReturning.mockResolvedValue([updated]);

    const result = await deductStockKg("p1", 6);

    expect(result).toEqual([updated]);
    expect(mockUpdate).toHaveBeenCalled();
  });

  // C2: 在庫不足 → 空配列返却
  it("在庫不足で空配列を返す", async () => {
    mockReturning.mockResolvedValue([]);

    const result = await deductStockKg("p1", 100);

    expect(result).toEqual([]);
  });

  // C3: 在庫ぴったり → 減算成功
  it("在庫ぴったりで減算成功する（境界値）", async () => {
    const updated = { id: "p1", stockKg: 0 };
    mockReturning.mockResolvedValue([updated]);

    const result = await deductStockKg("p1", 50);

    expect(result).toEqual([updated]);
  });
});

describe("restoreStockKg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // C4: 指定量が加算される
  it("指定量が加算される", async () => {
    mockWhere.mockResolvedValue(undefined as never);

    await restoreStockKg("p1", 6);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
  });
});

describe("getAvailableProductsWithVariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // H1: product.isAvailable=true のみ返す
  it("isAvailable=true の商品のみ返す", async () => {
    const mockProducts = [
      {
        id: "p1",
        name: "早生みかん",
        stockKg: 100,
        isAvailable: true,
        variants: [
          { id: "v1", label: "3kg", weightKg: "3.000", priceJpy: 1800, isAvailable: true },
        ],
      },
    ];
    mockFindMany.mockResolvedValue(mockProducts);

    const result = await getAvailableProductsWithVariants();

    expect(result).toEqual(mockProducts);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    );
  });

  // H2: variant.isAvailable=false のバリエーションはフィルタされる（クエリ引数で確認）
  it("variants の where と orderBy が設定されている", async () => {
    mockFindMany.mockResolvedValue([]);

    await getAvailableProductsWithVariants();

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.with).toBeDefined();
    expect(callArgs.with.variants).toBeDefined();
    expect(callArgs.with.variants.where).toBeDefined();
    expect(callArgs.with.variants.orderBy).toBeDefined();
  });

  // H3: バリエーションが displayOrder 順（クエリ引数で確認）
  it("variants に orderBy が指定されている", async () => {
    mockFindMany.mockResolvedValue([]);

    await getAvailableProductsWithVariants();

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.with.variants.orderBy).toBeDefined();
  });

  // H4: 全variant非公開の商品は返らない（後処理フィルタ）
  it("全バリエーションが非公開の商品を除外する", async () => {
    const mockProducts = [
      {
        id: "p1",
        name: "早生みかん",
        stockKg: 100,
        isAvailable: true,
        variants: [
          { id: "v1", label: "3kg", isAvailable: true },
        ],
      },
      {
        id: "p2",
        name: "不知火",
        stockKg: 50,
        isAvailable: true,
        variants: [], // DB側でフィルタ済み → 空配列
      },
    ];
    mockFindMany.mockResolvedValue(mockProducts);

    const result = await getAvailableProductsWithVariants();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });
});
