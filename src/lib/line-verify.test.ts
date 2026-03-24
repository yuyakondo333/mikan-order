import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyLineIdToken } from "./line-verify";

describe("verifyLineIdToken", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.stubEnv("LIFF_CHANNEL_ID", "1234567890");
  });

  it("正しいIDトークンでユーザー情報を返し、LIFF_CHANNEL_IDがclient_idとして送信される", async () => {
    const mockResponse = {
      sub: "U1234567890",
      name: "テストユーザー",
      picture: "https://example.com/pic.jpg",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await verifyLineIdToken("valid-id-token");

    expect(result).toEqual({
      sub: "U1234567890",
      name: "テストユーザー",
      picture: "https://example.com/pic.jpg",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.line.me/oauth2/v2.1/verify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );

    // client_id が LIFF_CHANNEL_ID の値そのままであること
    const callBody = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body;
    expect(callBody).toContain("client_id=1234567890");
    expect(callBody).toContain("id_token=valid-id-token");
  });

  it("LINE verify APIがエラーを返す場合nullを返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 })
    );

    const result = await verifyLineIdToken("invalid-token");
    expect(result).toBeNull();
  });

  it("空文字のIDトークンでもAPIを呼び出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 })
    );

    const result = await verifyLineIdToken("");
    expect(result).toBeNull();
    expect(fetch).toHaveBeenCalled();
  });

  it("LIFF_CHANNEL_IDが未設定の場合エラーをthrowする", async () => {
    vi.unstubAllEnvs();

    await expect(verifyLineIdToken("some-token")).rejects.toThrow(
      "LIFF_CHANNEL_ID"
    );
  });

  it("LIFF_CHANNEL_IDが空文字の場合エラーをthrowする", async () => {
    vi.stubEnv("LIFF_CHANNEL_ID", "");

    await expect(verifyLineIdToken("some-token")).rejects.toThrow(
      "LIFF_CHANNEL_ID"
    );
  });

  it("pictureが未設定のユーザーでもundefinedとして返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            sub: "U999",
            name: "No Pic User",
          }),
      })
    );

    const result = await verifyLineIdToken("token");
    expect(result).toEqual({
      sub: "U999",
      name: "No Pic User",
      picture: undefined,
    });
  });

  it("LINE APIが必須フィールド欠損のレスポンスを返した場合nullを返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ iss: "https://access.line.me" }),
      })
    );

    const result = await verifyLineIdToken("token");
    expect(result).toBeNull();
  });
});
