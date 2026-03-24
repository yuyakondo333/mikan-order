import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyLineIdToken } from "./line-verify";

// JWT形式のダミートークン（header.payload.signature）
const VALID_JWT_TOKEN = "header.payload.signature";

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
      aud: "1234567890",
      iss: "https://access.line.me",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await verifyLineIdToken(VALID_JWT_TOKEN);

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
    expect(callBody).toContain("id_token=header.payload.signature");
  });

  it("LINE verify APIがエラーを返す場合nullを返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 })
    );

    const result = await verifyLineIdToken(VALID_JWT_TOKEN);
    expect(result).toBeNull();
  });

  it("LIFF_CHANNEL_IDが未設定の場合エラーをthrowする", async () => {
    vi.unstubAllEnvs();

    await expect(verifyLineIdToken(VALID_JWT_TOKEN)).rejects.toThrow(
      "LIFF_CHANNEL_ID"
    );
  });

  it("LIFF_CHANNEL_IDが空文字の場合エラーをthrowする", async () => {
    vi.stubEnv("LIFF_CHANNEL_ID", "");

    await expect(verifyLineIdToken(VALID_JWT_TOKEN)).rejects.toThrow(
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
            aud: "1234567890",
            iss: "https://access.line.me",
          }),
      })
    );

    const result = await verifyLineIdToken(VALID_JWT_TOKEN);
    expect(result).toEqual({
      sub: "U999",
      name: "No Pic User",
      picture: undefined,
    });
  });

  describe("レスポンス検証", () => {
    it("audがLIFF_CHANNEL_IDと不一致の場合nullを返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              sub: "U123",
              name: "Test",
              aud: "9999999999",
              iss: "https://access.line.me",
            }),
        })
      );

      const result = await verifyLineIdToken(VALID_JWT_TOKEN);
      expect(result).toBeNull();
    });

    it("issがhttps://access.line.meでない場合nullを返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              sub: "U123",
              name: "Test",
              aud: "1234567890",
              iss: "https://evil.example.com",
            }),
        })
      );

      const result = await verifyLineIdToken(VALID_JWT_TOKEN);
      expect(result).toBeNull();
    });

    it("issが末尾スラッシュ付き（https://access.line.me/）の場合nullを返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              sub: "U123",
              name: "Test",
              aud: "1234567890",
              iss: "https://access.line.me/",
            }),
        })
      );

      const result = await verifyLineIdToken(VALID_JWT_TOKEN);
      expect(result).toBeNull();
    });

    it("audがレスポンスに含まれない場合nullを返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              sub: "U123",
              name: "Test",
              iss: "https://access.line.me",
            }),
        })
      );

      const result = await verifyLineIdToken(VALID_JWT_TOKEN);
      expect(result).toBeNull();
    });
  });

  describe("pictureスキーマ検証", () => {
    const validResponseWith = (picture: unknown) => ({
      sub: "U123",
      name: "Test",
      aud: "1234567890",
      iss: "https://access.line.me",
      picture,
    });

    it("pictureがhttp://の場合undefinedとして返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(validResponseWith("http://example.com/pic.jpg")),
        })
      );

      const result = await verifyLineIdToken(VALID_JWT_TOKEN);
      expect(result?.picture).toBeUndefined();
    });

    it("pictureがjavascript:の場合undefinedとして返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(validResponseWith("javascript:alert(1)")),
        })
      );

      const result = await verifyLineIdToken(VALID_JWT_TOKEN);
      expect(result?.picture).toBeUndefined();
    });

    it("pictureがdata:URIの場合undefinedとして返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(validResponseWith("data:image/png;base64,abc")),
        })
      );

      const result = await verifyLineIdToken(VALID_JWT_TOKEN);
      expect(result?.picture).toBeUndefined();
    });

    it("pictureが空文字の場合undefinedとして返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(validResponseWith("")),
        })
      );

      const result = await verifyLineIdToken(VALID_JWT_TOKEN);
      expect(result?.picture).toBeUndefined();
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

    const result = await verifyLineIdToken(VALID_JWT_TOKEN);
    expect(result).toBeNull();
  });

  describe("入力バリデーション", () => {
    it("JWT形式でないトークン（ドットなし）はnullを返しfetchが呼ばれない", async () => {
      vi.stubGlobal("fetch", vi.fn());

      const result = await verifyLineIdToken("no-dots-token");
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("2パート（ドット1つ）のトークンはnullを返す", async () => {
      vi.stubGlobal("fetch", vi.fn());

      const result = await verifyLineIdToken("header.payload");
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("4パート（ドット3つ）のトークンはnullを返す", async () => {
      vi.stubGlobal("fetch", vi.fn());

      const result = await verifyLineIdToken("a.b.c.d");
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("10,001文字以上のトークンはnullを返しfetchが呼ばれない", async () => {
      vi.stubGlobal("fetch", vi.fn());

      const longToken = "a".repeat(5000) + "." + "b".repeat(5000) + "." + "c";
      expect(longToken.length).toBe(10_003);

      const result = await verifyLineIdToken(longToken);
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("ちょうど10,000文字のJWT形式トークンは長さ制限に引っかからない", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 400 })
      );

      // 3パート形式を維持しつつ合計10,000文字（4999 + 1 + 4998 + 1 + 1 = 10000）
      const token = "a".repeat(4999) + "." + "b".repeat(4998) + "." + "c";
      expect(token.length).toBe(10_000);

      await verifyLineIdToken(token);
      expect(fetch).toHaveBeenCalled();
    });

    it("LIFF_CHANNEL_ID未設定でも不正形式トークンは入力バリデーションでnullを返す（throwしない）", async () => {
      vi.unstubAllEnvs();

      const result = await verifyLineIdToken("not-jwt-format");
      expect(result).toBeNull();
    });

    it("空文字のIDトークンはJWT形式チェックで弾かれnullを返す（fetchは呼ばれない）", async () => {
      vi.stubGlobal("fetch", vi.fn());

      const result = await verifyLineIdToken("");
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
