import { z } from "zod";
import { orderStatusEnum } from "@/db/schema";
import { PREFECTURES } from "@/lib/constants";

export const orderStatusSchema = z.enum(orderStatusEnum.enumValues);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const addressSchema = z.object({
  recipientName: z.string().min(1, "受取人名を入力してください"),
  postalCode: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません（例: 123-4567）"),
  prefecture: z.enum(PREFECTURES, {
    message: "有効な都道府県を選択してください",
  }),
  city: z.string().min(1, "市区町村を入力してください"),
  line1: z.string().min(1, "番地を入力してください"),
  line2: z.string().optional().default(""),
});

export const pickupTimeSlotSchema = z.enum([
  "morning",
  "early_afternoon",
  "late_afternoon",
]);

export const pickupDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません")
  .refine(
    (val) => {
      const date = new Date(val + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 14);
      return date >= tomorrow && date <= maxDate;
    },
    { message: "受取日は翌日から14日以内で選択してください" }
  );

const pickupOrderSchema = z.object({
  fulfillmentMethod: z.literal("pickup"),
  pickupDate: pickupDateSchema,
  pickupTimeSlot: pickupTimeSlotSchema,
});

const deliveryOrderSchema = z.object({
  fulfillmentMethod: z.literal("delivery"),
  address: addressSchema,
});

export const fulfillmentSchema = z.discriminatedUnion("fulfillmentMethod", [
  pickupOrderSchema,
  deliveryOrderSchema,
]);

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  priceJpy: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const createOrderSchema = z.object({
  order: fulfillmentSchema,
  items: z.array(orderItemSchema).min(1, "カートが空です"),
});

export const productSchema = z.object({
  name: z.string().min(1, "商品名を入力してください"),
  variety: z.string().min(1, "品種を入力してください"),
  weightGrams: z.number().int().positive("重量は1以上の整数を入力してください"),
  priceJpy: z.number().int().positive("価格は1以上の整数を入力してください"),
  description: z.string().optional().default(""),
  stock: z.number().int().min(0, "在庫数は0以上で入力してください"),
  stockUnit: z.string().min(1, "在庫単位を入力してください").default("kg"),
  isAvailable: z.boolean().default(true),
});

// --- Product Variants ---

export const variantSchema = z.object({
  label: z.string().min(1, "ラベルを入力してください"),
  weightKg: z.number().positive("重量は0より大きい値を入力してください"),
  priceJpy: z.number().int("価格は整数を入力してください").positive("価格は1以上の整数を入力してください"),
  isGiftOnly: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  isAvailable: z.boolean().default(true),
});

export const newProductSchema = z.object({
  name: z.string().min(1, "商品名を入力してください"),
  stockKg: z.number().min(0, "在庫は0以上で入力してください"),
  description: z.string().optional().default(""),
  isAvailable: z.boolean().default(true),
});

export const productWithVariantsSchema = z.object({
  product: newProductSchema,
  variants: z
    .array(variantSchema)
    .min(1, "最低1つのバリエーションが必要です"),
});

export type VariantFormData = z.infer<typeof variantSchema>;
export type NewProductFormData = z.infer<typeof newProductSchema>;
export type ProductWithVariantsFormData = z.infer<
  typeof productWithVariantsSchema
>;

// --- Server Action用スキーマ（DB型に合わせてweightKgはstring） ---

export const productActionSchema = z.object({
  name: z.string().min(1, "商品名を入力してください"),
  stockKg: z.number().min(0, "在庫は0以上で入力してください").optional(),
  description: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
});

export const variantActionSchema = z.object({
  label: z.string().min(1, "ラベルを入力してください"),
  weightKg: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "重量は0より大きい値を入力してください"
    ),
  priceJpy: z
    .number()
    .int("価格は整数を入力してください")
    .positive("価格は1以上の整数を入力してください"),
  isGiftOnly: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

export type AddressFormData = z.infer<typeof addressSchema>;
export type AddressDraft = Omit<AddressFormData, "prefecture"> & {
  prefecture: string;
};
export type CreateOrderData = z.infer<typeof createOrderSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type PickupTimeSlot = z.infer<typeof pickupTimeSlotSchema>;
export type FulfillmentData = z.infer<typeof fulfillmentSchema>;

// --- Idempotency Key ---
export const idempotencyKeySchema = z.string().uuid();
