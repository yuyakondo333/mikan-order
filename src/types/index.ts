export type Product = {
  id: string;
  name: string;
  variety: string;
  weightGrams: number;
  priceJpy: number;
  imageUrl: string | null;
  isAvailable: boolean;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type CartItemType = {
  id: string;
  name: string;
  priceJpy: number;
  quantity: number;
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

export type User = {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};
