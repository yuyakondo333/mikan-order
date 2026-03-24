// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CartCountProvider } from "./cart-count-provider";
import { CustomerHeader } from "./customer-header";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  return () => {
    act(() => root.unmount());
    container.remove();
  };
});

function renderHeader(initialCount: number) {
  return act(async () => {
    root.render(
      <CartCountProvider initialCount={initialCount}>
        <CustomerHeader />
      </CartCountProvider>
    );
  });
}

describe("CustomerHeader", () => {
  it("コンテキストの count=0 のときバッジが表示されない", async () => {
    await renderHeader(0);
    const badge = container.querySelector(".bg-red-500");
    expect(badge).toBeNull();
  });

  it("コンテキストの count=1 のときバッジに「1」が表示される", async () => {
    await renderHeader(1);
    const badge = container.querySelector(".bg-red-500");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("1");
  });

  it("コンテキストの count=99 のときバッジに「99」が表示される", async () => {
    await renderHeader(99);
    const badge = container.querySelector(".bg-red-500");
    expect(badge?.textContent).toBe("99");
  });

  it("「みかん農園」リンクが /products に遷移する", async () => {
    await renderHeader(0);
    const links = container.querySelectorAll("a");
    const farmLink = Array.from(links).find((l) =>
      l.textContent?.includes("みかん農園")
    );
    expect(farmLink?.getAttribute("href")).toBe("/products");
  });

  it("カートアイコンのリンクが /cart に遷移する", async () => {
    await renderHeader(0);
    const links = container.querySelectorAll("a");
    const cartLink = Array.from(links).find(
      (l) => l.getAttribute("href") === "/cart"
    );
    expect(cartLink).not.toBeNull();
  });
});
