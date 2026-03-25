import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const isConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

function createLimiter(tokens: number, window: string) {
  if (!isConfigured) return null;
  return new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    }),
    limiter: Ratelimit.slidingWindow(tokens, window),
  });
}

/** 注文作成: 3回/分 */
export const orderLimiter = createLimiter(3, "1 m");

/** カート操作: 30回/分 */
export const cartLimiter = createLimiter(30, "1 m");

/** 管理操作: 60回/分 */
export const adminLimiter = createLimiter(60, "1 m");

/**
 * レート制限チェック。
 * - 許可: null を返す
 * - 拒否: { success: false, error: string } を返す
 * - エラー/未設定: null を返す（フォールバック）
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: false; error: string } | null> {
  if (!limiter) return null;

  try {
    const { success } = await limiter.limit(identifier);
    if (!success) {
      return {
        success: false,
        error: "リクエストが多すぎます。しばらくしてから再度お試しください",
      };
    }
    return null;
  } catch {
    return null;
  }
}
