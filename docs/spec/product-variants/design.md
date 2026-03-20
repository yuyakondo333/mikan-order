# 商品バリエーション（重量選択）技術設計

## 1. DBスキーマ

### products テーブル（変更）

```typescript
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),                           // variety 廃止、name に統一
  // variety: 削除
  // weightGrams: 削除 → product_variants.weightKg
  // priceJpy: 削除 → product_variants.priceJpy
  // stockUnit: 削除（常にkg管理）
  stockKg: numeric("stock_kg", { precision: 10, scale: 3 })
    .default("0")
    .notNull(),                                            // stock → stock_kg (numeric)
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

削除カラム: `variety`, `weightGrams`, `priceJpy`, `stockUnit`
変更カラム: `stock` (integer) → `stockKg` (numeric(10,3))

### product_variants テーブル（新規）

```typescript
export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),                          // "3kg", "5kg 贈答用"
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }).notNull(),
  priceJpy: integer("price_jpy").notNull(),
  isGiftOnly: boolean("is_gift_only").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### cart_items テーブル（変更）

```typescript
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),  // 冗長カラム（在庫集計用）
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.variantId)]       // ユニーク制約変更
);
```

変更点:
- `productId` → `variantId` に主参照変更
- `productId` は冗長カラムとして残す（同一商品の合計在庫チェック効率化）
- ユニーク制約: `(userId, productId)` → `(userId, variantId)`

### order_items テーブル（変更）

```typescript
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  variantId: uuid("variant_id")
    .references(() => productVariants.id, { onDelete: "set null" }),  // NULL許可
  // スナップショット（注文時点の値を記録）
  productName: text("product_name").notNull(),
  label: text("label").notNull(),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }).notNull(),
  unitPriceJpy: integer("unit_price_jpy").notNull(),
  quantity: integer("quantity").notNull(),
});
```

変更点:
- `productId` → `variantId`（ON DELETE SET NULL）
- スナップショット追加: `productName`, `label`, `weightKg`

### Relations

```typescript
export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));
```

## 2. 型定義

`src/types/index.ts`:

```typescript
export type Product = {
  id: string;
  name: string;
  stockKg: string;          // numeric → string (Drizzle の numeric は string で返る)
  imageUrl: string | null;
  isAvailable: boolean;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  label: string;
  weightKg: string;         // numeric → string
  priceJpy: number;
  isGiftOnly: boolean;
  displayOrder: number;
  isAvailable: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ProductWithVariants = Product & {
  variants: ProductVariant[];
};

export type CartItemWithVariant = {
  id: string;
  variantId: string;
  productId: string;
  quantity: number;
  // product fields
  productName: string;
  productImageUrl: string | null;
  productIsAvailable: boolean;
  stockKg: string;
  // variant fields
  label: string;
  weightKg: string;
  priceJpy: number;
  variantIsAvailable: boolean;
  isGiftOnly: boolean;
  updatedAt: Date | string;
};

// CartItemWithProduct は廃止 → CartItemWithVariant に置換
```

**設計判断**: Drizzle の `numeric` 型は JavaScript で `string` として返る。表示・計算時に `Number()` or `parseFloat()` で変換する。これは精度を保つための Drizzle の仕様。

## 3. クエリ層

### `src/db/queries/products.ts`

```typescript
// 販売中商品をバリエーション付きで取得
export async function getAvailableProductsWithVariants(): Promise<ProductWithVariants[]>
// → products WHERE isAvailable = true
//   WITH variants WHERE isAvailable = true ORDER BY displayOrder

// 全商品をバリエーション付きで取得（管理画面用）
export async function getAllProductsWithVariants(): Promise<ProductWithVariants[]>

// 商品CRUD
export async function createProduct(data: {
  name: string;
  stockKg?: string;
  description?: string | null;
  isAvailable?: boolean;
}): Promise<Product>

export async function updateProduct(id: string, data: Partial<{
  name: string;
  stockKg: string;
  description: string | null;
  isAvailable: boolean;
}>): Promise<void>

export async function deleteProduct(id: string): Promise<void>

// 在庫消費計算（グラム変換不要、kgそのまま）
export function calcStockConsumption(quantity: number, weightKg: string): number {
  return quantity * Number(weightKg);
}

// 在庫を原子的に減算（kg単位）
export async function deductStock(productId: string, amountKg: number) {
  return db
    .update(products)
    .set({ stockKg: sql`${products.stockKg} - ${amountKg}` })
    .where(and(
      eq(products.id, productId),
      gte(products.stockKg, String(amountKg))
    ))
    .returning();
}

// 在庫復元（キャンセル時）
export async function restoreStock(productId: string, amountKg: number) {
  await db
    .update(products)
    .set({ stockKg: sql`${products.stockKg} + ${amountKg}` })
    .where(eq(products.id, productId));
}
```

### `src/db/queries/variants.ts`（新規）

```typescript
export async function createVariant(data: {
  productId: string;
  label: string;
  weightKg: string;
  priceJpy: number;
  isGiftOnly?: boolean;
  displayOrder?: number;
  isAvailable?: boolean;
}): Promise<ProductVariant>

export async function updateVariant(id: string, data: Partial<{
  label: string;
  weightKg: string;
  priceJpy: number;
  isGiftOnly: boolean;
  displayOrder: number;
  isAvailable: boolean;
}>): Promise<void>

export async function deleteVariant(id: string): Promise<void>

// バリエーション数を返す（最低1つバリデーション用）
export async function countVariantsByProductId(productId: string): Promise<number>
```

### `src/db/queries/cart.ts`（変更）

```typescript
export async function getCartItem(userId: string, variantId: string)
// WHERE userId AND variantId

export async function upsertCartItem(
  userId: string,
  variantId: string,
  productId: string,   // 冗長カラム用
  quantity: number
)
// ON CONFLICT (userId, variantId)

export async function deleteCartItem(userId: string, variantId: string)

export async function getCartWithVariants(userId: string): Promise<CartItemWithVariant[]>
// cartItems
//   JOIN productVariants ON variantId
//   JOIN products ON productId
// WHERE updatedAt > 7日前
// SELECT: cartItems.*, products.name, products.stockKg, products.isAvailable, products.imageUrl,
//         variants.label, variants.weightKg, variants.priceJpy, variants.isAvailable, variants.isGiftOnly
```

## 4. Server Actions

### `src/app/actions/cart.ts`（変更）

```
addToCart(variantId, quantity):
  1. 認証チェック
  2. variant + product を取得（variant.isAvailable, product.isAvailable チェック）
  3. 既存カートアイテム取得（同一variantId）
  4. 在庫チェック（個別）: (existingQty + quantity) * weightKg <= stockKg
  5. upsertCartItem(userId, variantId, productId, newQty)

updateCartItemQuantity(variantId, quantity):
  1. 認証チェック
  2. variant + product を取得
  3. 在庫チェック: quantity * weightKg <= stockKg
  4. upsertCartItem

removeFromCart(variantId):
  1. 認証チェック
  2. deleteCartItem(userId, variantId)
```

### `src/app/actions/orders.ts`（変更）

```
createOrder(fulfillmentData):
  1. 認証チェック
  2. getCartWithVariants(userId)
  3. 販売停止チェック（product.isAvailable AND variant.isAvailable）
  4. 在庫チェック（2段構え - 合計消費kgで判定）:
     // 同一商品のバリエーションを集約
     const consumptionByProduct = new Map<string, number>();
     for (const item of cartItems) {
       const consumption = Number(item.weightKg) * item.quantity;
       const current = consumptionByProduct.get(item.productId) ?? 0;
       consumptionByProduct.set(item.productId, current + consumption);
     }
     for (const [productId, totalKg] of consumptionByProduct) {
       if (totalKg > Number(stockKg)) error;
     }
  5. トランザクション内:
     a. 商品ごとに合計消費kgを原子的に減算
     b. 住所作成（配送時）
     c. orders 作成
     d. orderItems 作成（スナップショット付き）:
        cartItems.map(item => ({
          orderId,
          variantId: item.variantId,
          productName: item.productName,
          label: item.label,
          weightKg: item.weightKg,
          unitPriceJpy: item.priceJpy,
          quantity: item.quantity,
        }))
     e. カートクリア
  6. LINE通知

updateOrderStatusAction(orderId, status):
  キャンセル時の在庫復元:
  - order_items.weightKg（スナップショット）× quantity で復元量を計算
  - variantId → product_variants → productId で復元先商品を特定
  - variantId が NULL の場合（バリエーション削除済み）は復元スキップ
    ※ またはorder_itemsにproductIdのスナップショットも持たせて対応
```

**設計判断: キャンセル時のproductId特定**

`order_items.variantId` が SET NULL になる可能性があるため、復元先の productId を特定できないケースがある。対策として `order_items` に `product_id` カラムも残す:

```typescript
// order_items に追加
productId: uuid("product_id")
  .references(() => products.id, { onDelete: "set null" }),  // 商品削除時もNULL
```

これにより、バリエーション削除後も `productId` から復元先を特定できる。商品自体が削除された場合のみ復元スキップ。

### `src/app/actions/products.ts`（変更）

```
createProductAction(data):
  - variety, weightGrams, priceJpy, stockUnit 関連のパラメータを削除
  - name, stockKg, description, isAvailable のみ受け付ける

updateProductAction(id, data):
  - 同上

// バリエーション用の新規 Actions
createVariantAction(productId, data)
updateVariantAction(variantId, data)
deleteVariantAction(variantId):
  - 残りバリエーション数をチェック（最低1つ）
```

## 5. バリデーション

`src/lib/validations.ts`:

```typescript
// 既存の productSchema を置換
export const productSchema = z.object({
  name: z.string().min(1, "商品名を入力してください"),
  stockKg: z.number().min(0, "在庫は0以上で入力してください"),
  description: z.string().optional().default(""),
  isAvailable: z.boolean().default(true),
});

// 新規
export const variantSchema = z.object({
  label: z.string().min(1, "ラベルを入力してください"),
  weightKg: z.number().positive("重量は0より大きい値を入力してください"),
  priceJpy: z.number().int().positive("価格は1以上の整数を入力してください"),
  isGiftOnly: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  isAvailable: z.boolean().default(true),
});

// 商品作成時（バリエーション必須）
export const productWithVariantsSchema = z.object({
  product: productSchema,
  variants: z.array(variantSchema).min(1, "最低1つのバリエーションが必要です"),
});
```

## 6. コンポーネント変更

### 顧客向け

| ファイル | 変更内容 |
|---------|---------|
| `product-card.tsx` | `ProductCardProps` を `ProductWithVariants` ベースに変更。バリエーション選択UI追加。数量セレクタの `maxQuantity` 計算を `stockKg / weightKg` に変更。 |
| `product-list.tsx` | `onAddToCart(variantId, quantity)` に引数変更。商品一覧は商品単位表示、最低価格「○○円〜」表示。 |
| `cart-content.tsx` | `CartItemWithProduct` → `CartItemWithVariant` に型変更。商品名 + ラベル表示。 |
| `cart-item.tsx` | ラベル表示追加。`removeFromCart(variantId)` に変更。 |
| `confirm-content.tsx` | 商品名 + ラベル表示。合計計算はそのまま（priceJpy × quantity）。 |
| `order-detail-view.tsx` | `productName` + `label` 表示に変更。`productVariety` 参照を削除。 |

### 管理画面

| ファイル | 変更内容 |
|---------|---------|
| `products-manager.tsx` | 大幅改修。商品フォーム簡素化（name, stockKg, description, isAvailable のみ）。バリエーション管理セクション追加（インライン追加/編集/削除）。 |
| `orders-table.tsx` | 変更なし（商品詳細は表示していない） |

### ProductCard のバリエーション選択UI（概要）

UIフローの詳細は要件定義で設計フェーズ送りとしたが、基本構造は以下:

```
ProductCard
├─ 商品情報（名前、画像、説明）
├─ 価格表示（最低価格「○○円〜」or 選択中バリエーションの価格）
├─ バリエーション選択（ラジオボタン or セグメント）
│   ├─ [3kg ¥2,500]  ← 選択可能
│   ├─ [5kg ¥4,000]  ← 選択可能
│   └─ [10kg ¥7,500] ← 在庫不足で disabled
├─ 数量セレクタ（選択中バリエーション × 数量 <= stockKg で最大値制限）
└─ カートに追加ボタン
```

バリエーションが1つだけの商品では選択UIを省略し、現在の表示に近いシンプルな見た目を維持する。

## 7. LINE通知

### 影響箇所

`src/lib/line.ts` の `sendPickupReadyNotification`:
- 現行: `itemsSummary = order.items.map(item => \`${item.productName} × ${item.quantity}\`).join("、")`
- 変更後: `itemsSummary = order.items.map(item => \`${item.productName} ${item.label} × ${item.quantity}\`).join("、")`

例: `"早生みかん 3kg × 2、不知火 5kg 贈答用 × 1"`

`sendOrderConfirmationWithBankTransfer`, `sendOrderConfirmationWithPickup` は金額・受取情報のみのため変更なし。

### 呼び出し元の変更

`orders.ts` の `updateOrderStatusAction` 内:
```typescript
// 変更前
const itemsSummary = order.items
  .map((item) => `${item.productName} × ${item.quantity}`)
  .join("、");

// 変更後（order_items のスナップショットを使用）
const itemsSummary = order.items
  .map((item) => `${item.productName} ${item.label} × ${item.quantity}`)
  .join("、");
```

## 8. クエリ層の変更詳細

### `getOrderWithUserAndItems` / `getOrderDetail`（変更）

現行: order_items → products を個別query（N+1）で productName, productVariety を取得
変更後: order_items 自体に productName, label のスナップショットがあるため、**productsへのJOINが不要になる**

```typescript
export async function getOrderWithUserAndItems(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      user: true,
      items: true,  // order_items のスナップショットだけで完結
    },
  });
}
```

N+1 クエリの解消という副次的メリットがある。

## 9. シードデータ

`src/db/seed.ts` を新構造で再作成:

```typescript
const seedProducts = [
  {
    name: "早生みかん",
    stockKg: "100",
    description: "甘みと酸味のバランスが良い早生みかん",
    isAvailable: true,
    variants: [
      { label: "3kg", weightKg: "3", priceJpy: 1800, displayOrder: 1 },
      { label: "5kg", weightKg: "5", priceJpy: 2800, displayOrder: 2 },
      { label: "10kg", weightKg: "10", priceJpy: 5000, displayOrder: 3 },
      { label: "5kg 贈答用", weightKg: "5", priceJpy: 3500, isGiftOnly: true, displayOrder: 4 },
    ],
  },
  {
    name: "不知火",
    stockKg: "50",
    description: "デコポンの品種名。甘みが強くジューシー",
    isAvailable: true,
    variants: [
      { label: "3kg", weightKg: "3", priceJpy: 2500, displayOrder: 1 },
      { label: "5kg", weightKg: "5", priceJpy: 3800, displayOrder: 2 },
      { label: "5kg 贈答用", weightKg: "5", priceJpy: 4500, isGiftOnly: true, displayOrder: 3 },
    ],
  },
  {
    name: "寿太郎",
    stockKg: "30",
    description: "濃厚な味わいの高級みかん",
    isAvailable: true,
    variants: [
      { label: "3kg", weightKg: "3", priceJpy: 3000, displayOrder: 1 },
      { label: "5kg", weightKg: "5", priceJpy: 4500, displayOrder: 2 },
    ],
  },
  {
    name: "青島みかん",
    stockKg: "80",
    description: "貯蔵熟成で甘みが増す晩生みかん",
    isAvailable: false,  // シーズンオフ
    variants: [
      { label: "5kg", weightKg: "5", priceJpy: 2500, displayOrder: 1 },
      { label: "10kg", weightKg: "10", priceJpy: 4500, displayOrder: 2 },
    ],
  },
];
```

## 10. マイグレーション戦略

### 方針

既存の本番データは存在しない（開発段階）ため、破壊的マイグレーションを許容する。

### 手順

1. `product_variants` テーブル作成
2. `products` テーブルからカラム削除（`variety`, `weight_grams`, `price_jpy`, `stock_unit`）
3. `products.stock` → `products.stock_kg` にリネーム + 型変更（integer → numeric(10,3)）
4. `cart_items` に `variant_id` 追加、`product_id` のユニーク制約解除
5. `order_items` に `variant_id`, `product_name`, `label`, `weight_kg`, `product_id` 追加
6. `order_items` から旧 `product_id` の NOT NULL 制約解除

`drizzle-kit generate` + `drizzle-kit push` で実行。

## 11. 実装ステップ

| Step | 内容 | 影響ファイル | テスト |
|------|------|-------------|--------|
| 1 | DBスキーマ変更 + マイグレーション | `schema.ts`, migration SQL | マイグレーション実行確認 |
| 2 | 型定義更新 | `types/index.ts` | 型チェック |
| 3 | バリデーション更新 | `validations.ts` | バリデーションテスト |
| 4 | product クエリ層変更 | `db/queries/products.ts` | クエリテスト |
| 5 | variant クエリ層新規作成 | `db/queries/variants.ts` | クエリテスト |
| 6 | cart クエリ層変更 | `db/queries/cart.ts` | クエリテスト |
| 7 | order クエリ層変更 | `db/queries/orders.ts` | クエリテスト |
| 8 | cart Server Actions 変更 | `actions/cart.ts` | Actions テスト |
| 9 | products Server Actions 変更 | `actions/products.ts` | Actions テスト |
| 10 | orders Server Actions 変更 | `actions/orders.ts` | Actions テスト |
| 11 | シードデータ更新 | `db/seed.ts` | シード実行確認 |
| 12 | ProductCard バリエーション選択UI | `product-card.tsx` | — |
| 13 | ProductList 変更 | `product-list.tsx` | — |
| 14 | カート画面変更 | `cart-content.tsx`, `cart-item.tsx` | — |
| 15 | 注文確認画面変更 | `confirm-content.tsx` | — |
| 16 | 注文詳細画面変更 | `order-detail-view.tsx` | — |
| 17 | 管理画面 - 商品管理変更 | `products-manager.tsx` | — |
| 18 | LINE通知変更 | `orders.ts` (呼び出し元) | — |

Step 1〜11 はバックエンド（TDDで実装）、Step 12〜18 はフロントエンド。
