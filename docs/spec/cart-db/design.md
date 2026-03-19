# カートDB化 技術設計

## 1. DBスキーマ

### cart_items テーブル

```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

Drizzle schema:

```typescript
export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique().on(table.userId, table.productId),
]);
```

**設計判断**: 価格カラムは持たない。表示時にproductsテーブルからJOINで取得し、注文確定時にorder_itemsに記録する。

### Relations追加

```typescript
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

// usersRelationsにcartItems追加
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  cartItems: many(cartItems),
}));
```

## 2. クエリ層

`src/db/queries/cart.ts`:

```typescript
// カート取得（商品情報JOIN）
async function getCartWithProducts(userId: string): Promise<CartItemWithProduct[]>

// カートアイテム数取得（ヘッダーバッジ用）
async function getCartItemCount(userId: string): Promise<number>

// カートアイテム追加/更新（UPSERT）
async function upsertCartItem(userId: string, productId: string, quantity: number): Promise<void>

// カートアイテム削除
async function deleteCartItem(userId: string, productId: string): Promise<void>

// カート全削除
async function deleteAllCartItems(userId: string): Promise<void>

// 期限切れカート削除（7日以上前）
async function deleteExpiredCartItems(userId: string): Promise<void>
```

**有効期限**: `getCartWithProducts` で `WHERE updated_at > NOW() - INTERVAL '7 days'` を付与。取得時に期限切れを自動除外。

## 3. Server Actions

`src/app/actions/cart.ts`:

### addToCart(productId, quantity)

```
1. auth() でセッション取得 → 未認証なら error
2. lineUserId → users テーブルで userId 取得
3. products テーブルで商品情報取得（存在チェック + isAvailable チェック）
4. 在庫チェック:
   - 現在のカート内数量を取得
   - (カート内数量 + 追加数量) の消費量を calcStockConsumption で計算
   - products.stock と比較
5. cart_items に UPSERT（既存なら数量加算）
6. revalidatePath("/") で全ページ再検証（ヘッダーバッジ更新のため）
7. 結果を返す（success / error）
```

### updateCartItemQuantity(productId, quantity)

```
1. auth() でセッション取得
2. 在庫チェック（新しい数量で再計算）
3. cart_items を UPDATE
4. revalidatePath("/")
```

### removeFromCart(productId)

```
1. auth() でセッション取得
2. cart_items を DELETE
3. revalidatePath("/")
```

### clearCart()

```
1. auth() でセッション取得
2. cart_items を全 DELETE (WHERE user_id = ?)
3. revalidatePath("/")
```

## 4. 認証ガード

### 方針

LIFF認証はクライアントサイド（LIFF SDK）で行われるため、**middlewareでの顧客ルート保護は行わない**。

認証はレイヤーごとに担保する:

| レイヤー | ガード | 未認証時の挙動 |
|---------|--------|---------------|
| Server Actions | `auth()` チェック | エラーを返す |
| Server Component | `auth()` チェック | 空のカートUI / 認証待ちUI表示 |
| Client Component | `LiffProvider` | LIFF init → signIn → session作成 |

**フロー**:
```
初回アクセス（セッションなし）:
  SC: auth() → null → 空カート表示
  CC: LiffProvider → LIFF init → signIn → session作成 → router.refresh()
  SC: auth() → session → DBからカート取得 → 表示

2回目以降（セッションあり）:
  SC: auth() → session → DBからカート取得 → SSRで表示
```

## 5. コンポーネント構成の変更

### (customer)/layout.tsx: CC → SC に変更

現在:
```
layout.tsx (CC)
└─ SessionProvider > LiffProvider > CustomerHeader > {children}
```

変更後:
```
layout.tsx (SC)
├─ auth() → session
├─ getCartItemCount(userId) → count
└─ <CustomerProviders> (CC)
     ├─ SessionProvider
     ├─ LiffProvider
     ├─ <CustomerHeader itemCount={count} />
     └─ {children}
```

- `layout.tsx` を SC 化し、`auth()` でサーバーサイドセッション取得
- `SessionProvider` / `LiffProvider` を `CustomerProviders` (CC) に集約
- `CustomerHeader` は `itemCount` を props で受け取る（localStorage廃止）

### cart/page.tsx

```
page.tsx (SC)
├─ auth() → session
├─ getCartWithProducts(userId) → items
├─ deleteExpiredCartItems(userId) ← 期限切れクリーンアップ
└─ <CartContent items={items} />
```

`CartContent` はpropsでカートデータを受け取り、操作はServer Actionsを呼ぶ。

### confirm/page.tsx

```
page.tsx (SC)
├─ auth() → session
├─ getCartWithProducts(userId) → items
└─ <ConfirmContent items={items} />
```

`ConfirmContent` はpropsでカートデータを受け取る。fulfillmentは引き続きsessionStorageから取得。

### product-list.tsx

- `handleAddToCart` を Server Action `addToCart` の呼び出しに変更
- localStorage操作を削除
- `useTransition` で楽観的UI（ボタン無効化 + トースト表示）

### customer-header.tsx

- `localStorage` のイベントリスナーを削除
- `itemCount` を props で受け取るだけのシンプルなコンポーネントに変更
- CC → CC のまま（props受け取り）

## 6. 注文確定フローの変更

### /api/orders POST

現在: クライアント送信の `items` を信頼してDBに書き込み

変更後:
```
1. auth() でセッション取得
2. userId から cart_items を取得（DBが真のソース）
3. カートが空なら 400 エラー
4. products JOIN で最新の価格を取得
5. 在庫チェック + 減算（現行ロジック維持）
6. orders + order_items 作成
7. clearCart() でカート削除
8. LINE通知送信
```

**重要な変更**: リクエストボディの `items` は不要になる。カートはDBから取得。`order` (fulfillment) のみクライアントから送信。

createOrderSchema の変更:
```typescript
// 変更前
export const createOrderSchema = z.object({
  order: fulfillmentSchema,
  items: z.array(orderItemSchema).min(1),
});

// 変更後
export const createOrderSchema = z.object({
  order: fulfillmentSchema,
  // items は不要（DBから取得）
});
```

## 7. 型定義の変更

```typescript
// 新規: カートアイテム（DB + 商品情報JOIN済み）
export type CartItemWithProduct = {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  priceJpy: number;
  weightGrams: number;
  stockUnit: string;
  stock: number;
  updatedAt: Date | string;
};

// CartItemType は廃止（CartItemWithProduct に統一）
```

## 8. 実装ステップ

| Step | 内容 | 影響ファイル |
|------|------|-------------|
| 1 | DBスキーマ + マイグレーション | `schema.ts`, migration SQL |
| 2 | カートクエリ層 | `db/queries/cart.ts` |
| 3 | カートServer Actions | `app/actions/cart.ts` |
| 4 | レイアウトSC化 + Providers分離 | `layout.tsx`, `customer-providers.tsx` |
| 5 | カートページSC化 | `cart/page.tsx`, `cart-content.tsx` |
| 6 | 商品一覧のカート追加SA化 | `product-list.tsx` |
| 7 | ヘッダーバッジprops化 | `customer-header.tsx` |
| 8 | 注文確認ページSC化 | `confirm/page.tsx`, `confirm-content.tsx` |
| 9 | 注文APIのカートDB化 | `api/orders/route.ts`, `validations.ts` |
| 10 | localStorage関連コード削除 + 型整理 | `types/index.ts` 等 |
