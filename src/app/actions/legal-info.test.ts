import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("server-only", () => ({}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn<() => Promise<Session | null>>(),
}));
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

const mockUpsertLegalInfo = vi.fn();
vi.mock("@/db/queries/legal-info", () => ({
  upsertLegalInfo: (...args: unknown[]) => mockUpsertLegalInfo(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { upsertLegalInfoAction } from "@/app/actions/legal-info";
import { revalidatePath } from "next/cache";

const validData = {
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

function setupAdmin() {
  mockAuth.mockResolvedValue({
    user: { role: "admin", email: "admin@example.com" },
    expires: "",
  } as Session);
}

function setupUnauthenticated() {
  mockAuth.mockResolvedValue(null);
}

function setupCustomer() {
  mockAuth.mockResolvedValue({
    user: { role: "customer", lineUserId: "U123", displayName: "test" },
    expires: "",
  } as Session);
}

describe("upsertLegalInfoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 認証チェック
  it("未認証時にエラーを返す", async () => {
    setupUnauthenticated();

    const result = await upsertLegalInfoAction(validData);

    expect(result).toEqual({ success: false, error: "管理者認証が必要です" });
    expect(mockUpsertLegalInfo).not.toHaveBeenCalled();
  });

  it("customerロールでエラーを返す", async () => {
    setupCustomer();

    const result = await upsertLegalInfoAction(validData);

    expect(result).toEqual({ success: false, error: "管理者認証が必要です" });
  });

  it("adminロールで成功する", async () => {
    setupAdmin();
    mockUpsertLegalInfo.mockResolvedValue({ id: "1", ...validData });

    const result = await upsertLegalInfoAction(validData);

    expect(result.success).toBe(true);
    expect(mockUpsertLegalInfo).toHaveBeenCalled();
  });

  // バリデーション正常系
  it("全必須フィールド指定で成功する", async () => {
    setupAdmin();
    mockUpsertLegalInfo.mockResolvedValue({ id: "1", ...validData });

    const result = await upsertLegalInfoAction(validData);

    expect(result.success).toBe(true);
  });

  it("email省略（optional）で成功する", async () => {
    setupAdmin();
    mockUpsertLegalInfo.mockResolvedValue({ id: "1", ...validData, email: null });

    const result = await upsertLegalInfoAction(validData);

    expect(result.success).toBe(true);
  });

  // バリデーション異常系
  it("sellerName空文字でバリデーションエラーを返す", async () => {
    setupAdmin();

    const result = await upsertLegalInfoAction({ ...validData, sellerName: "" });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockUpsertLegalInfo).not.toHaveBeenCalled();
  });

  it("必須フィールド欠落でバリデーションエラーを返す", async () => {
    setupAdmin();

    const { sellerName, ...missingData } = validData;
    const result = await upsertLegalInfoAction(missingData as typeof validData);

    expect(result.success).toBe(false);
    expect(mockUpsertLegalInfo).not.toHaveBeenCalled();
  });

  // revalidatePath
  it("成功時に /admin/legal と /legal が revalidate される", async () => {
    setupAdmin();
    mockUpsertLegalInfo.mockResolvedValue({ id: "1", ...validData });

    await upsertLegalInfoAction(validData);

    expect(revalidatePath).toHaveBeenCalledWith("/admin/legal");
    expect(revalidatePath).toHaveBeenCalledWith("/legal");
  });

  // エラーハンドリング
  it("DB障害時に安全なエラーメッセージを返す", async () => {
    setupAdmin();
    mockUpsertLegalInfo.mockRejectedValue(new Error("DB connection failed"));

    const result = await upsertLegalInfoAction(validData);

    expect(result).toEqual({
      success: false,
      error: "特定商取引法情報の保存に失敗しました",
    });
  });

  it("DB障害時にrevalidatePathが呼ばれない", async () => {
    setupAdmin();
    mockUpsertLegalInfo.mockRejectedValue(new Error("DB error"));

    await upsertLegalInfoAction(validData);

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
