import type { FulfillmentData } from "@/lib/validations";

export type { FulfillmentData };

let cachedRaw: string | null = null;
let cachedParsed: FulfillmentData | null = null;

export function getFulfillmentFromStorage(): FulfillmentData | null {
  try {
    const raw = sessionStorage.getItem("orderFulfillment");
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? JSON.parse(raw) : null;
    }
    return cachedParsed;
  } catch {
    return null;
  }
}

/** テスト用: キャッシュをリセットする */
export function resetFulfillmentCache(): void {
  cachedRaw = null;
  cachedParsed = null;
}
