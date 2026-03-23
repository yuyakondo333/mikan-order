import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchAddressByPostalCode } from "./postal-code";

describe("searchAddressByPostalCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ハイフン付き郵便番号でAPI結果が返る", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 200,
          results: [
            { address1: "東京都", address2: "渋谷区", address3: "神宮前" },
          ],
        })
      )
    );

    const result = await searchAddressByPostalCode("150-0001");
    expect(result).toEqual({ prefecture: "東京都", city: "渋谷区神宮前" });
  });

  it("ハイフンなし郵便番号でAPI結果が返る", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 200,
          results: [
            { address1: "大阪府", address2: "大阪市北区", address3: "梅田" },
          ],
        })
      )
    );

    const result = await searchAddressByPostalCode("5300001");
    expect(result).toEqual({ prefecture: "大阪府", city: "大阪市北区梅田" });
  });

  it("7桁未満の郵便番号はnullを返す", async () => {
    expect(await searchAddressByPostalCode("150-00")).toBeNull();
    expect(await searchAddressByPostalCode("12345")).toBeNull();
  });

  it("数字以外を含む入力はnullを返す", async () => {
    expect(await searchAddressByPostalCode("abc-defg")).toBeNull();
    expect(await searchAddressByPostalCode("123-abcd")).toBeNull();
  });

  it("空文字入力はnullを返す", async () => {
    expect(await searchAddressByPostalCode("")).toBeNull();
  });

  it("APIレスポンスのresultsがnullの場合はnullを返す", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 200, results: null }))
    );

    expect(await searchAddressByPostalCode("000-0000")).toBeNull();
  });

  it("ネットワークエラーの場合はnullを返す", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    expect(await searchAddressByPostalCode("150-0001")).toBeNull();
  });

  it("不正なJSONレスポンスの場合はnullを返す", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("invalid json", { status: 200 })
    );

    expect(await searchAddressByPostalCode("150-0001")).toBeNull();
  });
});
