// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CartCountProvider, useCartCount } from "./cart-count-provider";

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

function CountDisplay() {
  const { count } = useCartCount();
  return <span data-testid="count">{count}</span>;
}

let capturedContext: ReturnType<typeof useCartCount>;

function CountController() {
  capturedContext = useCartCount();
  return <span data-testid="count">{capturedContext.count}</span>;
}

describe("CartCountProvider", () => {
  describe("初期化", () => {
    it("initialCount=0 で初期化される", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={0}>
            <CountDisplay />
          </CartCountProvider>
        );
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("0");
    });

    it("initialCount=5 で初期化される", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={5}>
            <CountDisplay />
          </CartCountProvider>
        );
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("5");
    });

    it("initialCount に負の値を渡した場合 0 として扱う", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={-3}>
            <CountDisplay />
          </CartCountProvider>
        );
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("0");
    });
  });

  describe("setCount", () => {
    it("setCount で任意の値に更新できる", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={0}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.setCount(3);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("3");
    });

    it("setCount(0) で 0 に戻せる", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={5}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.setCount(0);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("0");
    });

    it("setCount に負の値を渡した場合 0 にクランプされる", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={5}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.setCount(-10);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("0");
    });
  });

  describe("incrementCount", () => {
    it("incrementCount(1) でカウントが1増える", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={0}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.incrementCount(1);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("1");
    });

    it("incrementCount(-1) でカウントが1減る", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={5}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.incrementCount(-1);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("4");
    });

    it("incrementCount(-totalCount) でカウントが0になる", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={3}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.incrementCount(-3);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("0");
    });

    it("incrementCount の結果が負にならない（0で下限クランプ）", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={1}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.incrementCount(-5);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("0");
    });

    it("incrementCount(0) で値が変化しない", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={3}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.incrementCount(0);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("3");
    });

    it("incrementCount を連続で呼んでも正しく累積する", async () => {
      await act(async () => {
        root.render(
          <CartCountProvider initialCount={0}>
            <CountController />
          </CartCountProvider>
        );
      });
      await act(async () => {
        capturedContext.incrementCount(1);
        capturedContext.incrementCount(1);
        capturedContext.incrementCount(1);
      });
      expect(
        container.querySelector('[data-testid="count"]')?.textContent
      ).toBe("3");
    });
  });

  describe("Provider 外での使用", () => {
    it("Provider 外で useCartCount を使うとエラーになる", async () => {
      let caughtError: Error | null = null;

      function ThrowingComponent() {
        try {
          useCartCount();
        } catch (error) {
          caughtError = error as Error;
        }
        return <span>fallback</span>;
      }

      await act(async () => {
        root.render(<ThrowingComponent />);
      });

      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toContain(
        "useCartCount must be used within a CartCountProvider"
      );
    });
  });
});
