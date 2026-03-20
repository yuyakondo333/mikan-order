# 商品バリエーション — 残タスク

PR1〜PR7 + クリーンアップPR で機能実装完了。以下は将来対応の残タスク。

## 旧スキーマカラム削除（マイグレーション）

旧カラム（`variety`, `weight_grams`, `price_jpy`, `stock_unit`, `stock`）は `products` テーブルにまだ残っている。
`createProduct` が旧カラムにダミー値を書き込んでいるため、カラム削除には `createProduct` の更新も必要。

### 手順
1. `src/db/schema.ts` から旧カラム定義を削除
2. `src/db/queries/products.ts` の `createProduct` から旧カラム参照を削除
3. `src/db/seed.ts` から旧カラム値を削除
4. `drizzle-kit generate` でマイグレーション生成
5. `drizzle-kit push` でDB反映
6. ビルド・テスト確認

### 削除対象カラム
- `products.variety` (text)
- `products.weight_grams` (integer)
- `products.price_jpy` (integer)
- `products.stock_unit` (text)
- `products.stock` (integer)

## cart_items ユニーク制約の変更

現在: `UNIQUE(user_id, product_id)`
目標: `UNIQUE(user_id, variant_id)`

同一商品の別バリエーションを個別にカートに入れるため。
`upsertCartItemByVariant` の `onConflictDoUpdate` ターゲットも変更が必要。

## 旧バリデーション削除

`src/lib/validations.ts` の旧 `productSchema`（variety, weightGrams, priceJpy, stock, stockUnit）は
もう使われていない。`newProductSchema` に一本化して旧版を削除する。

## 手動E2E確認

- [ ] シードデータ投入 → 商品一覧にバリエーション表示
- [ ] バリエーション選択 → カート追加 → 注文作成フロー
- [ ] 管理画面でバリエーション追加/編集/削除
- [ ] 注文キャンセル → 在庫復元確認
- [ ] LINE通知にバリエーションラベルが含まれること
