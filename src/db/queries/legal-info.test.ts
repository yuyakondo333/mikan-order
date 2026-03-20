import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();

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
    mockFrom.mockResolvedValue([]);

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
    mockFrom.mockResolvedValue([mockData]);

    const result = await getLegalInfo();

    expect(result).toEqual(mockData);
  });
});
