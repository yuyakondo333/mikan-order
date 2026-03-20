import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("server-only", () => ({}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn<() => Promise<Session | null>>(),
}));
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/db/queries/products", () => ({
  createProduct: vi.fn().mockResolvedValue({ id: "p1", name: "test" }),
  updateProduct: vi.fn().mockResolvedValue(undefined),
  deleteProduct: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  toggleProductAvailabilityAction,
} from "@/app/actions/products";

describe("products Server Actions 認証チェック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const unauthenticatedCases = [
    ["createProductAction", () =>
      createProductAction({
        name: "test",
        variety: "test",
        weightGrams: 1000,
        priceJpy: 500,
      }),
    ],
    ["updateProductAction", () => updateProductAction("p1", { name: "new" })],
    ["deleteProductAction", () => deleteProductAction("p1")],
    ["toggleProductAvailabilityAction", () =>
      toggleProductAvailabilityAction("p1", false),
    ],
  ] as const;

  it.each(unauthenticatedCases)(
    "%s: 未認証時にエラーを返す",
    async (_name, action) => {
      mockAuth.mockResolvedValue(null);
      const result = await action();
      expect(result).toEqual({
        success: false,
        error: "管理者認証が必要です",
      });
    }
  );

  it.each(unauthenticatedCases)(
    "%s: customerロールでエラーを返す",
    async (_name, action) => {
      mockAuth.mockResolvedValue({
        user: { role: "customer", lineUserId: "U123", displayName: "test" },
        expires: "",
      } as Session);
      const result = await action();
      expect(result).toEqual({
        success: false,
        error: "管理者認証が必要です",
      });
    }
  );

  it("createProductAction: adminロールで成功する", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "admin", email: "admin@example.com" },
      expires: "",
    } as Session);

    const result = await createProductAction({
      name: "test",
      variety: "test",
      weightGrams: 1000,
      priceJpy: 500,
    });
    expect(result.success).toBe(true);
  });
});
