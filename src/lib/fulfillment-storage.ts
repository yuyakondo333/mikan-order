type PickupData = {
  fulfillmentMethod: "pickup";
  pickupDate: string;
  pickupTimeSlot: string;
};

type DeliveryData = {
  fulfillmentMethod: "delivery";
  address: {
    recipientName: string;
    postalCode: string;
    prefecture: string;
    city: string;
    line1: string;
    line2?: string;
  };
};

export type FulfillmentData = PickupData | DeliveryData;

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
