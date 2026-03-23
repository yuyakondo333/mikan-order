// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getFulfillmentFromStorage,
  resetFulfillmentCache,
} from "./fulfillment-storage";

describe("getFulfillmentFromStorage", () => {
  beforeEach(() => {
    resetFulfillmentCache();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("sessionStorageにデータがある場合、連続呼び出しで同一オブジェクト参照を返す", () => {
    const data = { fulfillmentMethod: "pickup" as const, pickupDate: "2026-03-24", pickupTimeSlot: "morning" };
    sessionStorage.setItem("orderFulfillment", JSON.stringify(data));

    const first = getFulfillmentFromStorage();
    const second = getFulfillmentFromStorage();

    expect(first).toEqual(data);
    expect(first).toBe(second); // 同一参照
  });

  it("sessionStorageのデータが変わった場合、新しいオブジェクトを返す", () => {
    const data1 = { fulfillmentMethod: "pickup" as const, pickupDate: "2026-03-24", pickupTimeSlot: "morning" };
    sessionStorage.setItem("orderFulfillment", JSON.stringify(data1));
    const first = getFulfillmentFromStorage();

    const data2 = { fulfillmentMethod: "pickup" as const, pickupDate: "2026-03-25", pickupTimeSlot: "late_afternoon" };
    sessionStorage.setItem("orderFulfillment", JSON.stringify(data2));
    const second = getFulfillmentFromStorage();

    expect(first).toEqual(data1);
    expect(second).toEqual(data2);
    expect(first).not.toBe(second);
  });

  it("sessionStorageにデータがない場合、nullを返す", () => {
    expect(getFulfillmentFromStorage()).toBeNull();
  });

  it("sessionStorageがエラーを投げた場合、nullを返す", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(getFulfillmentFromStorage()).toBeNull();
  });
});
