import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockDeleteWhere = vi.fn();
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelect = vi.fn(() => ({
  from: (...args: unknown[]) => {
    mockSelectFrom(...args);
    return { where: mockSelectWhere };
  },
}));

vi.mock("@/db", () => ({
  db: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    insert: (...args: unknown[]) => (mockInsert as any)(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (...args: unknown[]) => (mockUpdate as any)(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: (...args: unknown[]) => (mockDelete as any)(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (...args: unknown[]) => (mockSelect as any)(...args),
  },
}));

vi.mock("@/db/schema", async () => {
  const actual = await vi.importActual("@/db/schema");
  return actual;
});

import {
  createVariant,
  updateVariant,
  deleteVariant,
  countVariantsByProductId,
} from "./variants";

describe("createVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("バリエーションを作成して返す", async () => {
    const variant = {
      id: "v1",
      productId: "p1",
      label: "3kg",
      weightKg: "3.000",
      priceJpy: 1800,
    };
    mockInsertReturning.mockResolvedValue([variant]);

    const result = await createVariant({
      productId: "p1",
      label: "3kg",
      weightKg: "3",
      priceJpy: 1800,
    });

    expect(result).toEqual(variant);
    expect(mockInsert).toHaveBeenCalled();
  });
});

describe("updateVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("バリエーションを更新する", async () => {
    mockUpdateWhere.mockResolvedValue(undefined as never);

    await updateVariant("v1", { label: "5kg", priceJpy: 2800 });

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ label: "5kg", priceJpy: 2800 })
    );
  });
});

describe("deleteVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("バリエーションを削除する", async () => {
    mockDeleteWhere.mockResolvedValue(undefined);

    await deleteVariant("v1");

    expect(mockDelete).toHaveBeenCalled();
  });
});

// H8: countVariantsByProductId
describe("countVariantsByProductId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正しい件数を返す", async () => {
    mockSelectWhere.mockResolvedValue([{ count: 3 }]);

    const result = await countVariantsByProductId("p1");

    expect(result).toBe(3);
  });

  it("バリエーションが0件の場合0を返す", async () => {
    mockSelectWhere.mockResolvedValue([{ count: 0 }]);

    const result = await countVariantsByProductId("p1");

    expect(result).toBe(0);
  });
});
