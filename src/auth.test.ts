import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { JWT } from "next-auth/jwt";

vi.mock("@/lib/line-verify", () => ({
  verifyLineIdToken: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({})),
}));

vi.mock("next-auth/providers/google", () => ({
  default: {},
}));

import { authConfig } from "@/auth";

const jwtCallback = authConfig.callbacks.jwt;
const signInCallback = authConfig.callbacks.signIn;

describe("auth callbacks", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_EMAIL: "admin@example.com" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("signIn callback", () => {
    it("ADMIN_EMAILと一致するGoogleアカウントを許可する", async () => {
      const result = await signInCallback({
        account: { provider: "google" },
        profile: { email: "admin@example.com" },
      } as never);
      expect(result).toBe(true);
    });

    it("ADMIN_EMAILと一致しないGoogleアカウントを拒否する", async () => {
      const result = await signInCallback({
        account: { provider: "google" },
        profile: { email: "other@example.com" },
      } as never);
      expect(result).toBe(false);
    });

    it("ADMIN_EMAILが未設定の場合Googleログインを拒否する", async () => {
      delete process.env.ADMIN_EMAIL;
      const result = await signInCallback({
        account: { provider: "google" },
        profile: { email: "admin@example.com" },
      } as never);
      expect(result).toBe(false);
    });

    it("ADMIN_EMAILが空文字の場合Googleログインを拒否する", async () => {
      process.env.ADMIN_EMAIL = "";
      const result = await signInCallback({
        account: { provider: "google" },
        profile: { email: "" },
      } as never);
      expect(result).toBe(false);
    });

    it("LINE LIFFプロバイダーは常に許可する", async () => {
      const result = await signInCallback({
        account: { provider: "line-liff" },
      } as never);
      expect(result).toBe(true);
    });
  });

  describe("jwt callback - admin session expiry", () => {
    it("Googleログイン時にadminロールとadminLoginAtを設定する", async () => {
      const token: JWT = {};
      const result = await jwtCallback({
        token,
        user: { id: "1", email: "admin@example.com" },
        account: { provider: "google" },
      } as never);

      expect(result.role).toBe("admin");
      expect(result.adminLoginAt).toBeDefined();
    });

    it("8時間以内のadminセッションはroleを維持する", async () => {
      const token: JWT = {
        role: "admin",
        adminLoginAt: Math.floor(Date.now() / 1000) - 7 * 60 * 60, // 7 hours ago
      };
      const result = await jwtCallback({
        token,
        user: undefined,
        account: undefined,
      } as never);

      expect(result.role).toBe("admin");
    });

    it("8時間超過のadminセッションはroleを消去する", async () => {
      const token: JWT = {
        role: "admin",
        adminLoginAt: Math.floor(Date.now() / 1000) - 9 * 60 * 60, // 9 hours ago
      };
      const result = await jwtCallback({
        token,
        user: undefined,
        account: undefined,
      } as never);

      expect(result.role).toBeUndefined();
      expect(result.adminLoginAt).toBeUndefined();
    });

    it("LINE LIFFログイン時にcustomerロールを設定する", async () => {
      const token: JWT = {};
      const result = await jwtCallback({
        token,
        user: { id: "U123", name: "test", image: null },
        account: { provider: "line-liff" },
      } as never);

      expect(result.role).toBe("customer");
      expect(result.lineUserId).toBe("U123");
    });
  });
});
