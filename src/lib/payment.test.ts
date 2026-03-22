import { describe, it, expect } from "vitest";
import { hasBankTransferInfo } from "./payment";

describe("hasBankTransferInfo", () => {
  it("全5フィールド設定時にtrueを返す", () => {
    const info = {
      bankName: "みかん銀行",
      branchName: "果実支店",
      accountType: "普通",
      accountNumber: "1234567",
      accountHolder: "ミカンノウエン",
    };
    expect(hasBankTransferInfo(info)).toBe(true);
  });

  it("全フィールドnullでfalseを返す", () => {
    const info = {
      bankName: null,
      branchName: null,
      accountType: null,
      accountNumber: null,
      accountHolder: null,
    };
    expect(hasBankTransferInfo(info)).toBe(false);
  });

  it("1フィールドだけnullならfalseを返す", () => {
    const info = {
      bankName: "みかん銀行",
      branchName: "果実支店",
      accountType: "普通",
      accountNumber: null,
      accountHolder: "ミカンノウエン",
    };
    expect(hasBankTransferInfo(info)).toBe(false);
  });

  it("空文字フィールドがあればfalseを返す", () => {
    const info = {
      bankName: "",
      branchName: "果実支店",
      accountType: "普通",
      accountNumber: "1234567",
      accountHolder: "ミカンノウエン",
    };
    expect(hasBankTransferInfo(info)).toBe(false);
  });
});
