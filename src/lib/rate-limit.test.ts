import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLimit } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {},
}));

vi.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    limit = mockLimit;
    static slidingWindow = vi.fn();
  }
  return { Ratelimit: MockRatelimit };
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("リミッターが許可を返した場合、nullを返す", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    mockLimit.mockResolvedValue({ success: true });

    const { checkRateLimit, orderLimiter } = await import("@/lib/rate-limit");
    const result = await checkRateLimit(orderLimiter, "user-1");

    expect(result).toBeNull();
  });

  it("リミッターが拒否を返した場合、エラーメッセージを返す", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    mockLimit.mockResolvedValue({ success: false });

    const { checkRateLimit, orderLimiter } = await import("@/lib/rate-limit");
    const result = await checkRateLimit(orderLimiter, "user-1");

    expect(result).toEqual({
      success: false,
      error: "リクエストが多すぎます。しばらくしてから再度お試しください",
    });
  });

  it("環境変数未設定時は常にnullを返す（スキップ）", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const { checkRateLimit, orderLimiter } = await import("@/lib/rate-limit");
    const result = await checkRateLimit(orderLimiter, "user-1");

    expect(result).toBeNull();
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it("Redis接続エラー時はnullを返す（フォールバック）", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    mockLimit.mockRejectedValue(new Error("Connection refused"));

    const { checkRateLimit, orderLimiter } = await import("@/lib/rate-limit");
    const result = await checkRateLimit(orderLimiter, "user-1");

    expect(result).toBeNull();
  });
});
