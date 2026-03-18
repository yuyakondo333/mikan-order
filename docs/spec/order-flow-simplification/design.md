# 注文フロー簡素化 - 技術設計書

## 変更対象ファイル一覧

| ファイル | 変更種別 | 概要 |
|---------|---------|------|
| `src/db/schema.ts` | 変更 | Enum変更、ordersテーブルに受取方法・時間帯追加、addressIdをnullable化、phone廃止 |
| `src/db/migrations/` | 新規 | マイグレーションファイル |
| `src/lib/validations.ts` | 変更 | 受取方法別のバリデーションスキーマ |
| `src/types/index.ts` | 変更 | Order型・Address型の更新 |
| `src/app/(customer)/address/page.tsx` | 変更 | 受取方法選択 + 条件分岐フォームに書き換え |
| `src/app/(customer)/confirm/page.tsx` | 新規 | 注文確認画面 |
| `src/app/(customer)/complete/page.tsx` | 新規 | 注文完了画面 |
| `src/app/api/orders/route.ts` | 変更 | 注文作成ロジックの変更 |
| `src/app/api/addresses/route.ts` | 変更 | phoneフィールド削除対応 |
| `src/db/queries/orders.ts` | 変更 | 型更新 |
| `src/db/queries/addresses.ts` | 変更 | phoneフィールド削除対応 |
| `src/components/order-detail-view.tsx` | 変更 | 受取方法に応じた表示切替 |
| `src/components/order-status-badge.tsx` | 変更 | 新ステータスのラベル・色追加 |
| `src/components/admin/orders-table.tsx` | 変更 | 受取方法表示、ステータスフロー対応 |
| `src/app/actions/orders.ts` | 変更なし | updateOrderStatusActionはそのまま使える |

## 1. DBスキーマ変更

### 方針: addressesテーブル維持 + nullable FK

- addressesテーブルは維持（住所の再利用・自動入力のため）
- ordersテーブルの `addressId` をnullable化（取り置き時はNULL）
- ordersテーブルに `fulfillmentMethod`, `pickupTimeSlot` を追加
- addressesテーブルから `phone` カラムを削除
- `paymentMethodEnum` を廃止（受取方法で自動決定）

### Enum変更

```typescript
// 受取方法（新規追加）
export const fulfillmentMethodEnum = pgEnum("fulfillment_method", [
  "pickup",    // 取り置き
  "delivery",  // お届け
]);

// 注文ステータス（変更）
export const orderStatusEnum = pgEnum("order_status", [
  "pending",            // 注文受付
  "awaiting_payment",   // 入金待ち（お届けのみ）
  "payment_confirmed",  // 入金確認済（お届けのみ）
  "preparing",          // 準備中
  "ready",              // 準備完了（取り置きのみ）
  "shipped",            // 発送済（お届けのみ）
  "completed",          // 完了（受取済/配達完了）
  "cancelled",          // キャンセル
]);

// paymentMethodEnum → 廃止
```

### ordersテーブル変更

```typescript
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),

  // 受取方法（新規）
  fulfillmentMethod: fulfillmentMethodEnum("fulfillment_method").notNull(),

  // 取り置き用（新規）
  pickupTimeSlot: text("pickup_time_slot"),  // "morning" | "early_afternoon" | "late_afternoon"

  // お届け用（既存 → nullable化）
  addressId: uuid("address_id").references(() => addresses.id),  // NULLable に変更

  // paymentMethod → 削除

  status: orderStatusEnum("status").default("pending").notNull(),
  totalJpy: integer("total_jpy").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### addressesテーブル変更

```typescript
export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  recipientName: text("recipient_name").notNull(),
  postalCode: text("postal_code").notNull(),
  prefecture: text("prefecture").notNull(),
  city: text("city").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  // phone → 削除
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 廃止するもの

- `paymentMethodEnum`
- `orders.paymentMethod` カラム
- `addresses.phone` カラム

## 2. バリデーション（Zod）

```typescript
export const pickupTimeSlotEnum = z.enum([
  "morning",
  "early_afternoon",
  "late_afternoon",
]);

// 取り置き注文
const pickupOrderSchema = z.object({
  fulfillmentMethod: z.literal("pickup"),
  pickupTimeSlot: pickupTimeSlotEnum,
});

// お届け注文
const deliveryOrderSchema = z.object({
  fulfillmentMethod: z.literal("delivery"),
  address: addressSchema,  // 既存のaddressSchemaを再利用（phone削除後）
});

// 注文作成スキーマ（discriminated union）
export const createOrderSchema = z.object({
  lineUserId: z.string().min(1),
  displayName: z.string().min(1),
  pictureUrl: z.string().nullable().optional(),
  order: z.discriminatedUnion("fulfillmentMethod", [
    pickupOrderSchema,
    deliveryOrderSchema,
  ]),
  items: z.array(orderItemSchema).min(1, "カートが空です"),
});

// addressSchema（phone削除）
export const addressSchema = z.object({
  recipientName: z.string().min(1, "受取人名を入力してください"),
  postalCode: z.string().regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません"),
  prefecture: z.string().min(1, "都道府県を入力してください"),
  city: z.string().min(1, "市区町村を入力してください"),
  line1: z.string().min(1, "番地を入力してください"),
  line2: z.string().optional().default(""),
});
```

## 3. 顧客向け画面フロー

### 動線

```
/cart → /address（情報入力）→ /confirm（確認）→ /complete（完了）
```

### /address ページ（情報入力）

```
┌─────────────────────────────┐
│  受取方法                    │
│  ┌──────────┐ ┌──────────┐  │
│  │ 取り置き  │ │ お届け    │  │
│  └──────────┘ └──────────┘  │
├─────────────────────────────┤
│                             │
│ 【取り置き選択時】            │
│  時間帯を選んでください       │
│  ○ 午前中（9:00〜12:00）    │
│  ○ 13:00〜15:00            │
│  ○ 15:00〜17:00            │
│                             │
│ 【お届け選択時】              │
│  受取人名: [________]        │
│  郵便番号: [________]        │
│  都道府県: [________]        │
│  市区町村: [________]        │
│  番地:     [________]        │
│  建物名:   [________]（任意） │
│                             │
├─────────────────────────────┤
│ [確認画面へ進む]（disabled）   │
│ ※必須項目未入力時は非活性     │
└─────────────────────────────┘
```

#### ボタン非活性ロジック

- **取り置き**: `pickupTimeSlot` が未選択 → disabled
- **お届け**: `recipientName`, `postalCode`, `prefecture`, `city`, `line1` のいずれかが空 → disabled

#### データの受け渡し

入力データは sessionStorage に保存して /confirm へ遷移。

### /confirm ページ（注文確認）

```
┌─────────────────────────────┐
│  注文内容の確認               │
├─────────────────────────────┤
│  【注文商品】                 │
│  温州みかん 3kg × 2  ¥6,000  │
│  ...                        │
│  ───────────────────         │
│  合計: ¥6,000                │
├─────────────────────────────┤
│  【受取方法】                 │
│  取り置き                    │
│  時間帯: 午前中（9:00〜12:00）│
│  お支払い: 店頭でお支払い      │
│                             │
│  または                      │
│                             │
│  【受取方法】                 │
│  お届け                      │
│  宛名: 山田太郎              │
│  〒123-4567 愛媛県松山市...   │
│  お支払い: 銀行振込（事前入金）│
├─────────────────────────────┤
│ [注文を確定する]              │
│ [戻る]                       │
└─────────────────────────────┘
```

- 「注文を確定する」ボタンでPOST /api/ordersを実行
- 成功後、カート・sessionStorageをクリアして /complete へ遷移

### /complete ページ（注文完了）

```
┌─────────────────────────────┐
│  ✓ ご注文ありがとうございます  │
│                             │
│ 【取り置きの場合】            │
│  準備ができましたら           │
│  LINEでお知らせします。       │
│                             │
│ 【お届けの場合】              │
│  振込先をLINEでご案内します    │
│  ので、お振込をお願い          │
│  いたします。                 │
│                             │
│ [注文履歴を見る]              │
│ [トップに戻る]                │
└─────────────────────────────┘
```

## 4. API変更（POST /api/orders）

### リクエストボディ

```typescript
// 取り置き
{
  lineUserId: "U...",
  displayName: "山田太郎",
  order: {
    fulfillmentMethod: "pickup",
    pickupTimeSlot: "morning"
  },
  items: [{ id: "...", priceJpy: 3000, quantity: 2 }]
}

// お届け
{
  lineUserId: "U...",
  displayName: "山田太郎",
  order: {
    fulfillmentMethod: "delivery",
    address: {
      recipientName: "山田太郎",
      postalCode: "123-4567",
      prefecture: "愛媛県",
      city: "松山市",
      line1: "1-2-3",
      line2: "マンション101"
    }
  },
  items: [{ id: "...", priceJpy: 3000, quantity: 2 }]
}
```

### 処理フロー

1. `createOrderSchema.safeParse(body)` でバリデーション
2. `upsertUser()` でユーザー作成/取得
3. 受取方法に応じて処理分岐:
   - **取り置き**: `orders` に `fulfillmentMethod: "pickup"`, `pickupTimeSlot`, `addressId: null` で作成
   - **お届け**: `addresses` に住所INSERT → `orders` に `fulfillmentMethod: "delivery"`, `addressId`, `status: "awaiting_payment"` で作成
4. `orderItems` に明細INSERT
5. レスポンスに `fulfillmentMethod` を含めて返す（/complete画面で表示切替に使用）

## 5. 注文詳細表示（order-detail-view.tsx）

受取方法で表示を切り替え:

- **取り置き**: 「受取方法: 取り置き」「時間帯: 午前中（9:00〜12:00）」「お支払い: 店頭でお支払い」
- **お届け**: 「受取方法: お届け」「配送先: 〒xxx-xxxx ...」「お支払い: 銀行振込（事前入金）」

## 6. 管理画面（orders-table.tsx）

### 注文一覧の変更

- 受取方法バッジ（取り置き/お届け）を追加表示
- ステータスのドロップダウンを受取方法に応じた選択肢に制限

### ステータス選択肢

| 受取方法 | 選択可能なステータス |
|---------|-------------------|
| 取り置き | pending → preparing → ready → completed, cancelled |
| お届け | pending → awaiting_payment → payment_confirmed → preparing → shipped → completed, cancelled |

## 7. ステータスバッジ（order-status-badge.tsx）

新ステータスのラベル・色を追加:

| ステータス | ラベル | 色 |
|-----------|-------|-----|
| pending | 注文受付 | yellow |
| awaiting_payment | 入金待ち | orange |
| payment_confirmed | 入金確認済 | blue |
| preparing | 準備中 | purple |
| ready | 準備完了 | teal |
| shipped | 発送済 | green |
| completed | 完了 | gray |
| cancelled | キャンセル | red |

## 8. マイグレーション戦略

1. `fulfillment_method` Enumを追加
2. `order_status` Enumの値を更新（confirmed/delivered → awaiting_payment/payment_confirmed/ready/completed）
3. `orders` テーブルに `fulfillment_method`, `pickup_time_slot` カラム追加
4. `orders.address_id` をNULLable化
5. 既存注文データがあれば `fulfillment_method = 'delivery'` としてマイグレーション
6. `orders` から `payment_method` カラム削除
7. `addresses` テーブルから `phone` カラム削除
8. `payment_method` Enum削除

### 実行

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## 9. 実装タスク分解

| # | タスク | 依存 |
|---|-------|------|
| 1 | DBスキーマ変更 + マイグレーション | - |
| 2 | バリデーションスキーマ更新（validations.ts） | - |
| 3 | 型定義更新（types/index.ts） | - |
| 4 | API変更（POST /api/orders, GET /api/addresses） | 1, 2 |
| 5 | 顧客フォーム書き換え（/address ページ） | 2 |
| 6 | 注文確認画面の新規作成（/confirm ページ） | 5 |
| 7 | 注文完了画面の新規作成（/complete ページ） | 6 |
| 8 | ステータスバッジ更新（order-status-badge.tsx） | - |
| 9 | 注文詳細表示更新（order-detail-view.tsx） | 3, 8 |
| 10 | 管理画面更新（orders-table.tsx） | 3, 8 |
| 11 | 注文クエリ更新（queries/orders.ts） | 1 |
| 12 | 不要コード削除（phone関連） | 全タスク完了後 |
