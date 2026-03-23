import { describe, it, expect } from "vitest";
import {
  orderStatusSchema,
  addressSchema,
  variantSchema,
  newProductSchema,
  productWithVariantsSchema,
  idempotencyKeySchema,
} from "./validations";

describe("orderStatusSchema", () => {
  const validStatuses = [
    "pending",
    "awaiting_payment",
    "payment_confirmed",
    "preparing",
    "ready",
    "shipped",
    "completed",
    "cancelled",
  ];

  // V1: 全8種の有効ステータスを受け入れる
  it.each(validStatuses)("有効なステータス '%s' を受け入れる", (status) => {
    const result = orderStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it("無効な値を拒否する", () => {
    const result = orderStatusSchema.safeParse("invalid");
    expect(result.success).toBe(false);
  });
});

describe("addressSchema.prefecture", () => {
  it("有効な都道府県（東京都）を受け入れる", () => {
    const result = addressSchema.safeParse({
      recipientName: "田中太郎",
      postalCode: "123-4567",
      prefecture: "東京都",
      city: "渋谷区",
      line1: "1-2-3",
    });
    expect(result.success).toBe(true);
  });

  it("無効な都道府県文字列を拒否する", () => {
    const result = addressSchema.safeParse({
      recipientName: "田中太郎",
      postalCode: "123-4567",
      prefecture: "存在しない県",
      city: "渋谷区",
      line1: "1-2-3",
    });
    expect(result.success).toBe(false);
  });

  it("XSSペイロードを都道府県として拒否する", () => {
    const result = addressSchema.safeParse({
      recipientName: "田中太郎",
      postalCode: "123-4567",
      prefecture: "<script>alert(1)</script>",
      city: "渋谷区",
      line1: "1-2-3",
    });
    expect(result.success).toBe(false);
  });
});

describe("variantSchema", () => {
  // A4: label が空文字 → エラー
  it("label が空文字の場合エラーになる", () => {
    const result = variantSchema.safeParse({
      label: "",
      weightKg: 3,
      priceJpy: 1800,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "ラベルを入力してください"
      );
    }
  });

  // A5: weightKg が 0 → エラー（positive）
  it("weightKg が 0 の場合エラーになる", () => {
    const result = variantSchema.safeParse({
      label: "3kg",
      weightKg: 0,
      priceJpy: 1800,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "重量は0より大きい値を入力してください"
      );
    }
  });

  // A6: weightKg が 0.5（小数）→ 成功
  it("weightKg が 0.5（小数）の場合成功する", () => {
    const result = variantSchema.safeParse({
      label: "0.5kg",
      weightKg: 0.5,
      priceJpy: 800,
    });
    expect(result.success).toBe(true);
  });

  // A7: priceJpy が 0 → エラー（positive）
  it("priceJpy が 0 の場合エラーになる", () => {
    const result = variantSchema.safeParse({
      label: "3kg",
      weightKg: 3,
      priceJpy: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "価格は1以上の整数を入力してください"
      );
    }
  });

  // A8: priceJpy が小数 → エラー（int）
  it("priceJpy が小数の場合エラーになる", () => {
    const result = variantSchema.safeParse({
      label: "3kg",
      weightKg: 3,
      priceJpy: 1800.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "価格は整数を入力してください"
      );
    }
  });

  // A9: 正常値で成功
  it("正常値で成功する", () => {
    const result = variantSchema.safeParse({
      label: "3kg",
      weightKg: 3,
      priceJpy: 1800,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        label: "3kg",
        weightKg: 3,
        priceJpy: 1800,
        isGiftOnly: false,
        displayOrder: 0,
        isAvailable: true,
      });
    }
  });

  // A12: デフォルト値が適用される
  it("デフォルト値（isGiftOnly=false, displayOrder=0, isAvailable=true）が適用される", () => {
    const result = variantSchema.safeParse({
      label: "5kg 贈答用",
      weightKg: 5,
      priceJpy: 3500,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isGiftOnly).toBe(false);
      expect(result.data.displayOrder).toBe(0);
      expect(result.data.isAvailable).toBe(true);
    }
  });
});

describe("newProductSchema", () => {
  // A1: name が空文字 → エラー
  it("name が空文字の場合エラーになる", () => {
    const result = newProductSchema.safeParse({
      name: "",
      stockKg: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "商品名を入力してください"
      );
    }
  });

  // A2: stockKg が負数 → エラー
  it("stockKg が負数の場合エラーになる", () => {
    const result = newProductSchema.safeParse({
      name: "早生みかん",
      stockKg: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "在庫は0以上で入力してください"
      );
    }
  });

  // A3: 正常値で成功
  it("正常値で成功する", () => {
    const result = newProductSchema.safeParse({
      name: "早生みかん",
      stockKg: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "早生みかん",
        stockKg: 100,
        description: "",
        isAvailable: true,
      });
    }
  });

  // A13: stockKg が 0.5（小数）→ 成功
  it("stockKg が 0.5（小数）の場合成功する", () => {
    const result = newProductSchema.safeParse({
      name: "早生みかん",
      stockKg: 0.5,
    });
    expect(result.success).toBe(true);
  });
});

describe("idempotencyKeySchema", () => {
  // V1: 有効なUUID v4 → pass
  it("有効なUUID v4文字列を受け入れる", () => {
    const result = idempotencyKeySchema.safeParse(
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(result.success).toBe(true);
  });

  // V2: 空文字 → fail
  it("空文字を拒否する", () => {
    const result = idempotencyKeySchema.safeParse("");
    expect(result.success).toBe(false);
  });

  // V3: 非UUID文字列 → fail
  it("非UUID文字列を拒否する", () => {
    const result = idempotencyKeySchema.safeParse("not-a-uuid");
    expect(result.success).toBe(false);
  });
});

describe("productWithVariantsSchema", () => {
  // A10: variants が空配列 → エラー
  it("variants が空配列の場合エラーになる", () => {
    const result = productWithVariantsSchema.safeParse({
      product: { name: "早生みかん", stockKg: 100 },
      variants: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const variantsError = result.error.issues.find(
        (i) => i.path[0] === "variants"
      );
      expect(variantsError?.message).toBe(
        "最低1つのバリエーションが必要です"
      );
    }
  });

  // A11: variants が1つ以上で成功
  it("variants が1つ以上の場合成功する", () => {
    const result = productWithVariantsSchema.safeParse({
      product: { name: "早生みかん", stockKg: 100 },
      variants: [
        { label: "3kg", weightKg: 3, priceJpy: 1800 },
      ],
    });
    expect(result.success).toBe(true);
  });
});
