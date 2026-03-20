import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn(() => ({ limit: mockLimit }));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return { from: mockFrom };
    },
  },
}));

vi.mock("@/db/schema", () => ({
  legalInfo: Symbol("legalInfo"),
}));

import { getLegalInfo } from "./legal-info";
import { legalInfo } from "@/db/schema";

describe("getLegalInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("データなしでnullを返す", async () => {
    mockLimit.mockResolvedValue([]);

    const result = await getLegalInfo();

    expect(mockFrom).toHaveBeenCalledWith(legalInfo);
    expect(result).toBeNull();
  });

  it("データありで正しいオブジェクトを返す", async () => {
    const mockData = {
      id: "test-id",
      sellerName: "テスト販売者",
      representative: "代表太郎",
      address: "東京都千代田区",
      phone: "03-1234-5678",
      email: "test@example.com",
      priceInfo: "商品ページに記載",
      shippingFee: "全国一律800円",
      additionalCost: "振込手数料はお客様負担",
      paymentMethod: "銀行振込",
      paymentDeadline: "注文後7日以内",
      deliveryTime: "入金確認後5営業日以内",
      returnPolicy: "商品到着後7日以内",
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockLimit.mockResolvedValue([mockData]);

    const result = await getLegalInfo();

    expect(result).toEqual(mockData);
  });

  it("複数行がある場合、最初の1行だけを返す", async () => {
    const first = { id: "first", sellerName: "販売者1" };
    const second = { id: "second", sellerName: "販売者2" };
    mockLimit.mockResolvedValue([first, second]);

    const result = await getLegalInfo();

    expect(result).toEqual(first);
  });

  it("email=nullのデータを正しく返す", async () => {
    const mockData = {
      id: "test-id",
      sellerName: "テスト販売者",
      representative: "代表太郎",
      address: "東京都千代田区",
      phone: "03-1234-5678",
      email: null,
      priceInfo: "商品ページに記載",
      shippingFee: "全国一律800円",
      additionalCost: "振込手数料はお客様負担",
      paymentMethod: "銀行振込",
      paymentDeadline: "注文後7日以内",
      deliveryTime: "入金確認後5営業日以内",
      returnPolicy: "商品到着後7日以内",
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockLimit.mockResolvedValue([mockData]);

    const result = await getLegalInfo();

    expect(result).toEqual(mockData);
    expect(result!.email).toBeNull();
  });

  it("noteに値があるデータを正しく返す", async () => {
    const mockData = {
      id: "test-id",
      sellerName: "テスト販売者",
      representative: "代表太郎",
      address: "東京都千代田区",
      phone: "03-1234-5678",
      email: null,
      priceInfo: "商品ページに記載",
      shippingFee: "全国一律800円",
      additionalCost: "振込手数料はお客様負担",
      paymentMethod: "銀行振込",
      paymentDeadline: "注文後7日以内",
      deliveryTime: "入金確認後5営業日以内",
      returnPolicy: "商品到着後7日以内",
      note: "特記事項あり",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockLimit.mockResolvedValue([mockData]);

    const result = await getLegalInfo();

    expect(result).toEqual(mockData);
    expect(result!.note).toBe("特記事項あり");
  });

  it("DBクエリ失敗時にエラーが伝播する", async () => {
    mockLimit.mockRejectedValue(new Error("DB connection failed"));

    await expect(getLegalInfo()).rejects.toThrow("DB connection failed");
  });
});
