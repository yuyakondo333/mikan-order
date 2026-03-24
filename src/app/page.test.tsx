import { describe, it, expect, vi, beforeEach } from "vitest";

class RedirectError extends Error {
  url: string;
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`);
    this.url = url;
  }
}

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import Home from "./page";

describe("Home (liff.state routing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("liff.state未指定 → /products にリダイレクト", async () => {
    await expect(
      Home({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='/products' → /products にリダイレクト（完全一致）", async () => {
    await expect(
      Home({ searchParams: Promise.resolve({ "liff.state": "/products" }) })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='/cart' → /cart にリダイレクト（別のALLOWED_PATH）", async () => {
    await expect(
      Home({ searchParams: Promise.resolve({ "liff.state": "/cart" }) })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/cart");
  });

  it("liff.state='/products/123' → /products/123 にリダイレクト（サブパス）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({ "liff.state": "/products/123" }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products/123");
  });

  it("liff.state='/unknown' → /products にフォールバック（許可外パス）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({ "liff.state": "/unknown" }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='/%ZZ' → /products にフォールバック（URIError）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({ "liff.state": "/%ZZ" }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='/products/../admin' → /products にフォールバック（パストラバーサル）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({ "liff.state": "/products/../admin" }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='/products/%2e%2e/admin' → /products にフォールバック（エンコード済みトラバーサル）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({
          "liff.state": "/products/%2e%2e/admin",
        }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='' → /products にフォールバック（空文字列）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({ "liff.state": "" }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='products' → /products にフォールバック（先頭スラッシュなし）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({ "liff.state": "products" }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state が配列 → /products にフォールバック（string[]型）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({
          "liff.state": ["/products", "/cart"],
        }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='//evil.com' → /products にフォールバック（プロトコル相対URL）", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({ "liff.state": "//evil.com" }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });

  it("liff.state='/products?foo=bar' → URL正規化によりクエリ除去、/products にリダイレクト", async () => {
    await expect(
      Home({
        searchParams: Promise.resolve({ "liff.state": "/products?foo=bar" }),
      })
    ).rejects.toThrow(RedirectError);

    expect(mockRedirect).toHaveBeenCalledWith("/products");
  });
});
