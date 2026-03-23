import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  pgEnum,
  unique,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const fulfillmentMethodEnum = pgEnum("fulfillment_method", [
  "pickup",
  "delivery",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "awaiting_payment",
  "payment_confirmed",
  "preparing",
  "ready",
  "shipped",
  "completed",
  "cancelled",
]);

// Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  lineUserId: text("line_user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  pictureUrl: text("picture_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Addresses
export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  recipientName: text("recipient_name").notNull(),
  postalCode: text("postal_code").notNull(),
  prefecture: text("prefecture").notNull(),
  city: text("city").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  variety: text("variety").notNull(),
  weightGrams: integer("weight_grams").notNull(),
  priceJpy: integer("price_jpy").notNull(),
  imageUrl: text("image_url"),
  stock: integer("stock").default(0).notNull(),
  stockUnit: text("stock_unit").default("kg").notNull(),
  stockKg: integer("stock_kg").default(0).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product Variants
export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }).notNull(),
  priceJpy: integer("price_jpy").notNull(),
  isGiftOnly: boolean("is_gift_only").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cart Items
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.productId)]
);

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  fulfillmentMethod: fulfillmentMethodEnum("fulfillment_method").notNull(),
  pickupDate: date("pickup_date"),
  pickupTimeSlot: text("pickup_time_slot"),
  addressId: uuid("address_id").references(() => addresses.id),
  status: orderStatusEnum("status").default("pending").notNull(),
  totalJpy: integer("total_jpy").notNull(),
  idempotencyKey: text("idempotency_key").unique(), // nullable: 既存注文レコードとの後方互換のためNULL許容
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  productName: text("product_name"),
  label: text("label"),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }),
  quantity: integer("quantity").notNull(),
  unitPriceJpy: integer("unit_price_jpy").notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  cartItems: many(cartItems),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  })
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  address: one(addresses, {
    fields: [orders.addressId],
    references: [addresses.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

// Legal Info (single-row settings table)
export const legalInfo = pgTable("legal_info", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerName: text("seller_name").notNull(),
  representative: text("representative").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  priceInfo: text("price_info").notNull(),
  shippingFee: text("shipping_fee").notNull(),
  additionalCost: text("additional_cost").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentDeadline: text("payment_deadline").notNull(),
  deliveryTime: text("delivery_time").notNull(),
  returnPolicy: text("return_policy").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment Settings (single-row settings table)
export const paymentSettings = pgTable("payment_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  bankName: text("bank_name"),
  branchName: text("branch_name"),
  accountType: text("account_type"),
  accountNumber: text("account_number"),
  accountHolder: text("account_holder"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));
