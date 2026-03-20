export type Product = {
  id: string;
  name: string;
  variety: string;
  weightGrams: number;
  priceJpy: number;
  imageUrl: string | null;
  stock: number;
  stockUnit: string;
  isAvailable: boolean;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type CartItemWithProduct = {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  priceJpy: number;
  weightGrams: number;
  stockUnit: string;
  stock: number;
  isAvailable: boolean;
  updatedAt: Date | string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  label: string;
  weightKg: string;
  priceJpy: number;
  isGiftOnly: boolean;
  displayOrder: number;
  isAvailable: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ProductWithVariants = Omit<
  Product,
  "variety" | "weightGrams" | "priceJpy" | "stock" | "stockUnit"
> & {
  stockKg: string;
  variants: ProductVariant[];
};

export type CartItemWithVariant = {
  id: string;
  variantId: string;
  productId: string;
  quantity: number;
  productName: string;
  productImageUrl: string | null;
  productIsAvailable: boolean;
  stockKg: string;
  label: string;
  weightKg: string;
  priceJpy: number;
  variantIsAvailable: boolean;
  isGiftOnly: boolean;
  updatedAt: Date | string;
};

export type FulfillmentMethod = "pickup" | "delivery";

export type PickupTimeSlot = "morning" | "early_afternoon" | "late_afternoon";

export type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "payment_confirmed"
  | "preparing"
  | "ready"
  | "shipped"
  | "completed"
  | "cancelled";

export type Order = {
  id: string;
  userId: string;
  fulfillmentMethod: string;
  pickupDate: string | null;
  pickupTimeSlot: string | null;
  addressId: string | null;
  status: string;
  totalJpy: number;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type Address = {
  id: string;
  userId: string;
  recipientName: string;
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type LegalInfo = {
  id: string;
  sellerName: string;
  representative: string;
  address: string;
  phone: string;
  email: string | null;
  priceInfo: string;
  shippingFee: string;
  additionalCost: string;
  paymentMethod: string;
  paymentDeadline: string;
  deliveryTime: string;
  returnPolicy: string;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type User = {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};
