import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("server-only", () => ({}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn<() => Promise<Session | null>>(),
}));
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

import { verifyAdmin } from "@/lib/admin-auth";

describe("verifyAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adminロールのセッションでtrueを返す", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "admin", email: "admin@example.com" },
      expires: "",
    } as Session);

    expect(await verifyAdmin()).toBe(true);
  });

  it("customerロールのセッションでfalseを返す", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "customer", lineUserId: "U123", displayName: "test" },
      expires: "",
    } as Session);

    expect(await verifyAdmin()).toBe(false);
  });

  it("セッションがnullの場合falseを返す", async () => {
    mockAuth.mockResolvedValue(null);

    expect(await verifyAdmin()).toBe(false);
  });

  it("roleが未定義の場合falseを返す", async () => {
    mockAuth.mockResolvedValue({
      user: { lineUserId: "U123", displayName: "test" },
      expires: "",
    } as Session);

    expect(await verifyAdmin()).toBe(false);
  });
});
