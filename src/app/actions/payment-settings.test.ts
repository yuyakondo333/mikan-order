import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("server-only", () => ({}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn<() => Promise<Session | null>>(),
}));
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

const mockUpsertPaymentSettings = vi.fn();
vi.mock("@/db/queries/payment-settings", () => ({
  upsertPaymentSettings: (...args: unknown[]) =>
    mockUpsertPaymentSettings(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { mockCheckRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  adminLimiter: "admin-limiter",
}));

import { upsertPaymentSettingsAction } from "@/app/actions/payment-settings";
import { revalidatePath } from "next/cache";

const validData = {
  bankName: "みかん銀行",
  branchName: "果実支店",
  accountType: "普通",
  accountNumber: "1234567",
  accountHolder: "ミカンノウエン",
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

describe("upsertPaymentSettingsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 認証チェック
  it("未認証時にエラーを返す", async () => {
    setupUnauthenticated();

    const result = await upsertPaymentSettingsAction(validData);

    expect(result).toEqual({ success: false, error: "管理者認証が必要です" });
    expect(mockUpsertPaymentSettings).not.toHaveBeenCalled();
  });

  it("customerロールでエラーを返す", async () => {
    setupCustomer();

    const result = await upsertPaymentSettingsAction(validData);

    expect(result).toEqual({ success: false, error: "管理者認証が必要です" });
  });

  // バリデーション正常系
  it("全フィールド設定で成功する", async () => {
    setupAdmin();
    mockUpsertPaymentSettings.mockResolvedValue({ id: "1", ...validData });

    const result = await upsertPaymentSettingsAction(validData);

    expect(result.success).toBe(true);
    expect(mockUpsertPaymentSettings).toHaveBeenCalled();
  });

  it("全フィールドnull/空で成功する", async () => {
    setupAdmin();
    const emptyData = {
      bankName: null,
      branchName: null,
      accountType: null,
      accountNumber: null,
      accountHolder: null,
    };
    mockUpsertPaymentSettings.mockResolvedValue({ id: "1", ...emptyData });

    const result = await upsertPaymentSettingsAction(emptyData);

    expect(result.success).toBe(true);
  });

  // revalidatePath
  it("成功時に /admin/payment が revalidate される", async () => {
    setupAdmin();
    mockUpsertPaymentSettings.mockResolvedValue({ id: "1", ...validData });

    await upsertPaymentSettingsAction(validData);

    expect(revalidatePath).toHaveBeenCalledWith("/admin/payment");
  });

  // エラーハンドリング
  it("DB障害時に安全なエラーメッセージを返す", async () => {
    setupAdmin();
    mockUpsertPaymentSettings.mockRejectedValue(
      new Error("DB connection failed")
    );

    const result = await upsertPaymentSettingsAction(validData);

    expect(result).toEqual({
      success: false,
      error: "お支払い設定の保存に失敗しました",
    });
  });

  it("DB障害時にrevalidatePathが呼ばれない", async () => {
    setupAdmin();
    mockUpsertPaymentSettings.mockRejectedValue(new Error("DB error"));

    await upsertPaymentSettingsAction(validData);

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("レート制限超過でエラーを返す", async () => {
    setupAdmin();
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      error: "リクエストが多すぎます。しばらくしてから再度お試しください",
    });

    const result = await upsertPaymentSettingsAction(validData);

    expect(result).toEqual({
      success: false,
      error: "リクエストが多すぎます。しばらくしてから再度お試しください",
    });
    expect(mockCheckRateLimit).toHaveBeenCalledWith("admin-limiter", "admin@example.com");
    expect(mockUpsertPaymentSettings).not.toHaveBeenCalled();
  });
});
