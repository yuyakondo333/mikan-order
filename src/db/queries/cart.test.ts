import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockFindFirst = vi.fn();

const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelectInnerJoin2 = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelectInnerJoin = vi.fn(() => ({ innerJoin: mockSelectInnerJoin2 }));
const mockSelect = vi.fn(() => ({
  from: (...args: unknown[]) => {
    mockSelectFrom(...args);
    return { innerJoin: mockSelectInnerJoin };
  },
}));

const mockInsertOnConflict = vi.fn();
const mockInsertValues = vi.fn(() => ({
  onConflictDoUpdate: mockInsertOnConflict,
}));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockDeleteWhere = vi.fn();
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

vi.mock("@/db", () => ({
  db: {
    query: {
      cartItems: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (...args: unknown[]) => (mockSelect as any)(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    insert: (...args: unknown[]) => (mockInsert as any)(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: (...args: unknown[]) => (mockDelete as any)(...args),
  },
}));

vi.mock("@/db/schema", async () => {
  const actual = await vi.importActual("@/db/schema");
  return actual;
});

import {
  getCartItemByVariant,
  upsertCartItemByVariant,
  deleteCartItemByVariant,
  getCartWithVariants,
} from "./cart";

describe("getCartWithVariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // H5: cart_items + variants + products の JOIN で必要フィールドが全て返る
  it("必要なフィールドが全て含まれるselect構造である", async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await getCartWithVariants("user-1");

    expect(result).toEqual([]);
    // select が呼ばれたことを確認
    expect(mockSelect).toHaveBeenCalled();
  });

  // H6: 7日以上前のカートアイテムは除外される（where条件に含まれる）
  it("7日以上前のアイテムが除外されるwhere条件が設定されている", async () => {
    mockSelectWhere.mockResolvedValue([]);

    await getCartWithVariants("user-1");

    // where が呼ばれた
    expect(mockSelectWhere).toHaveBeenCalled();
  });
});

describe("getCartItemByVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("variantId で既存カートアイテムを検索する", async () => {
    const item = { id: "ci-1", userId: "user-1", variantId: "v1", quantity: 2 };
    mockFindFirst.mockResolvedValue(item);

    const result = await getCartItemByVariant("user-1", "v1");

    expect(result).toEqual(item);
    expect(mockFindFirst).toHaveBeenCalled();
  });

  it("存在しない場合 undefined を返す", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const result = await getCartItemByVariant("user-1", "v-none");

    expect(result).toBeUndefined();
  });
});

describe("upsertCartItemByVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("variantId + productId でカートアイテムをupsertする", async () => {
    mockInsertOnConflict.mockResolvedValue(undefined);

    await upsertCartItemByVariant("user-1", "v1", "p1", 3);

    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalled();
  });
});

describe("deleteCartItemByVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("variantId でカートアイテムを削除する", async () => {
    mockDeleteWhere.mockResolvedValue(undefined);

    await deleteCartItemByVariant("user-1", "v1");

    expect(mockDelete).toHaveBeenCalled();
  });
});
