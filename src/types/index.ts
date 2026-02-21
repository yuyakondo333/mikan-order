export type Product = {
  id: string;
  name: string;
  variety: string;
  weightGrams: number;
  priceJpy: number;
  imageUrl: string | null;
  isAvailable: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CartItemType = {
  id: string;
  name: string;
  priceJpy: number;
  quantity: number;
};

export type Order = {
  id: string;
  userId: string;
  addressId: string;
  status: string;
  paymentMethod: string;
  totalJpy: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Address = {
  id: string;
  userId: string;
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2: string | null;
  phone: string;
  recipientName: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
