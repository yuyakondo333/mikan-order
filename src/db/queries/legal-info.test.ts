import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn(() => ({ limit: mockLimit }));

const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsert = vi.fn(() => ({
  values: (...args: unknown[]) => {
    mockInsertValues(...args);
    return { returning: mockInsertReturning };
  },
}));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return { from: mockFrom };
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  legalInfo: Symbol("legalInfo"),
}));

import { getLegalInfo, upsertLegalInfo } from "./legal-info";
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

const baseLegalData = {
  sellerName: "テスト販売者",
  representative: "代表太郎",
  address: "東京都千代田区1-1-1",
  phone: "03-1234-5678",
  priceInfo: "商品ページに記載",
  shippingFee: "全国一律800円",
  additionalCost: "振込手数料はお客様負担",
  paymentMethod: "銀行振込",
  paymentDeadline: "注文後7日以内",
  deliveryTime: "入金確認後5営業日以内",
  returnPolicy: "商品到着後7日以内",
};

describe("upsertLegalInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("データなしの場合INSERTが実行され結果を返す", async () => {
    const inserted = { id: "new-id", ...baseLegalData, email: null, note: null };
    mockLimit.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([inserted]);

    const result = await upsertLegalInfo(baseLegalData);

    expect(mockInsert).toHaveBeenCalledWith(legalInfo);
    expect(mockInsertValues).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });

  it("nullable フィールド省略で新規作成できる", async () => {
    const inserted = { id: "new-id", ...baseLegalData, email: null, note: null };
    mockLimit.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([inserted]);

    const result = await upsertLegalInfo(baseLegalData);

    expect(result).toEqual(inserted);
  });

  it("既存データがある場合UPDATEが実行され結果を返す", async () => {
    const existing = { id: "existing-id", ...baseLegalData, email: null, note: null };
    const updated = { ...existing, sellerName: "新販売者名" };
    mockLimit.mockResolvedValue([existing]);
    mockUpdateReturning.mockResolvedValue([updated]);

    const result = await upsertLegalInfo({ ...baseLegalData, sellerName: "新販売者名" });

    expect(mockUpdate).toHaveBeenCalledWith(legalInfo);
    expect(result).toEqual(updated);
  });

  it("DB障害時にエラーが伝播する", async () => {
    mockLimit.mockResolvedValue([]);
    mockInsertReturning.mockRejectedValue(new Error("DB write failed"));

    await expect(upsertLegalInfo(baseLegalData)).rejects.toThrow("DB write failed");
  });
});
