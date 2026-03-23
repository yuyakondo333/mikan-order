import { describe, it, expect } from "vitest";
import { areRequiredAddressFieldsFilled } from "./delivery-address-fields";
import type { AddressFormData } from "@/lib/validations";

const emptyAddress: AddressFormData = {
  recipientName: "",
  postalCode: "",
  prefecture: "",
  city: "",
  line1: "",
  line2: "",
};

const filledAddress: AddressFormData = {
  recipientName: "山田太郎",
  postalCode: "123-4567",
  prefecture: "東京都",
  city: "渋谷区",
  line1: "1-2-3",
  line2: "",
};

describe("areRequiredAddressFieldsFilled", () => {
  it("必須フィールドが全て空の場合、falseを返す", () => {
    expect(areRequiredAddressFieldsFilled(emptyAddress)).toBe(false);
  });

  it("一部の必須フィールドのみ入力されている場合、falseを返す", () => {
    const partial: AddressFormData = {
      ...emptyAddress,
      recipientName: "山田太郎",
      postalCode: "123-4567",
    };
    expect(areRequiredAddressFieldsFilled(partial)).toBe(false);
  });

  it("必須フィールドが全て入力されている場合、trueを返す", () => {
    expect(areRequiredAddressFieldsFilled(filledAddress)).toBe(true);
  });

  it("任意フィールド(line2)が空でも必須が全て入力済みならtrueを返す", () => {
    const withoutLine2: AddressFormData = {
      recipientName: "山田太郎",
      postalCode: "123-4567",
      prefecture: "東京都",
      city: "渋谷区",
      line1: "1-2-3",
      line2: "",
    };
    expect(areRequiredAddressFieldsFilled(withoutLine2)).toBe(true);
  });
});
