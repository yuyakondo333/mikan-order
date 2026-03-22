import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn(() => ({ limit: mockLimit }));

const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsert = vi.fn((_table: unknown) => ({
  values: (...args: unknown[]) => {
    mockInsertValues(...args);
    return { returning: mockInsertReturning };
  },
}));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn((_table: unknown) => ({ set: mockUpdateSet }));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return { from: mockFrom };
    },
    insert: (arg: unknown) => mockInsert(arg),
    update: (arg: unknown) => mockUpdate(arg),
  },
}));

vi.mock("@/db/schema", () => ({
  paymentSettings: Symbol("paymentSettings"),
}));

import { getPaymentSettings, upsertPaymentSettings } from "./payment-settings";
import { paymentSettings } from "@/db/schema";

describe("getPaymentSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("データなしでnullを返す", async () => {
    mockLimit.mockResolvedValue([]);

    const result = await getPaymentSettings();

    expect(mockFrom).toHaveBeenCalledWith(paymentSettings);
    expect(result).toBeNull();
  });

  it("データありで正しいオブジェクトを返す", async () => {
    const mockData = {
      id: "test-id",
      bankName: "みかん銀行",
      branchName: "果実支店",
      accountType: "普通",
      accountNumber: "1234567",
      accountHolder: "ミカンノウエン",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockLimit.mockResolvedValue([mockData]);

    const result = await getPaymentSettings();

    expect(result).toEqual(mockData);
  });

  it("全フィールドnullのレコードを正しく返す", async () => {
    const mockData = {
      id: "test-id",
      bankName: null,
      branchName: null,
      accountType: null,
      accountNumber: null,
      accountHolder: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockLimit.mockResolvedValue([mockData]);

    const result = await getPaymentSettings();

    expect(result).toEqual(mockData);
    expect(result!.bankName).toBeNull();
    expect(result!.accountNumber).toBeNull();
  });

  it("DBクエリ失敗時にエラーが伝播する", async () => {
    mockLimit.mockRejectedValue(new Error("DB connection failed"));

    await expect(getPaymentSettings()).rejects.toThrow("DB connection failed");
  });
});

describe("upsertPaymentSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseData = {
    bankName: "みかん銀行",
    branchName: "果実支店",
    accountType: "普通",
    accountNumber: "1234567",
    accountHolder: "ミカンノウエン",
  };

  it("データなし時にINSERTが実行され結果を返す（全フィールドnullable対応）", async () => {
    const nullData = {
      bankName: null,
      branchName: null,
      accountType: null,
      accountNumber: null,
      accountHolder: null,
    };
    const inserted = { id: "new-id", ...nullData, createdAt: new Date(), updatedAt: new Date() };
    mockLimit.mockResolvedValue([]);
    mockInsertReturning.mockResolvedValue([inserted]);

    const result = await upsertPaymentSettings(nullData);

    expect(mockInsert).toHaveBeenCalledWith(paymentSettings);
    expect(mockInsertValues).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });

  it("既存データ時にUPDATEが実行されupdatedAtが更新される", async () => {
    const existing = { id: "existing-id", ...baseData, createdAt: new Date(), updatedAt: new Date() };
    const updated = { ...existing, bankName: "新銀行" };
    mockLimit.mockResolvedValue([existing]);
    mockUpdateReturning.mockResolvedValue([updated]);

    const result = await upsertPaymentSettings({ ...baseData, bankName: "新銀行" });

    expect(mockUpdate).toHaveBeenCalledWith(paymentSettings);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) })
    );
    expect(result).toEqual(updated);
  });

  it("DB障害時にエラーが伝播する", async () => {
    mockLimit.mockResolvedValue([]);
    mockInsertReturning.mockRejectedValue(new Error("DB write failed"));

    await expect(upsertPaymentSettings(baseData)).rejects.toThrow("DB write failed");
  });
});
