import { describe, it, expect, vi, beforeEach } from "vitest";

// モック定義
vi.mock("next/headers", () => {
  const set = vi.fn();
  return {
    cookies: vi.fn().mockResolvedValue({ set }),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { cookies } from "next/headers";
import { loginAdmin } from "@/app/actions/admin";

describe("loginAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ADMIN_PASSWORD: "correct-password" };
  });

  it("正しいパスワードでログインできる", async () => {
    const result = await loginAdmin("correct-password");

    expect(result).toEqual({ success: true });

    const cookieStore = await cookies();
    expect(cookieStore.set).toHaveBeenCalledWith(
      "admin_session",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      })
    );
  });

  it("間違ったパスワードはエラーを返す", async () => {
    const result = await loginAdmin("wrong-password");

    expect(result).toEqual({
      success: false,
      error: "パスワードが正しくありません",
    });

    const cookieStore = await cookies();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("空のパスワードはエラーを返す", async () => {
    const result = await loginAdmin("");

    expect(result).toEqual({
      success: false,
      error: "パスワードが正しくありません",
    });

    const cookieStore = await cookies();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
