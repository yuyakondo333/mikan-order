import { z } from "zod";

export const addressSchema = z.object({
  recipientName: z.string().min(1, "受取人名を入力してください"),
  postalCode: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません（例: 123-4567）"),
  prefecture: z.string().min(1, "都道府県を入力してください"),
  city: z.string().min(1, "市区町村を入力してください"),
  line1: z.string().min(1, "番地を入力してください"),
  line2: z.string().optional().default(""),
  phone: z
    .string()
    .regex(
      /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/,
      "電話番号の形式が正しくありません（例: 090-1234-5678）"
    ),
});

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  priceJpy: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const createOrderSchema = z.object({
  lineUserId: z.string().min(1),
  displayName: z.string().min(1),
  pictureUrl: z.string().nullable().optional(),
  address: addressSchema,
  paymentMethod: z.enum(["bank_transfer", "cash_on_delivery"]),
  items: z.array(orderItemSchema).min(1, "カートが空です"),
});

export type AddressFormData = z.infer<typeof addressSchema>;
export type CreateOrderData = z.infer<typeof createOrderSchema>;
