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
5. SQLスクリプトで手動適用（下記「マイグレーション適用方法」参照）
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

## マイグレーション適用方法

本番DBは **CockroachDB** のため、`drizzle-kit push` / `drizzle-kit migrate` は互換性問題で使えない。

- `drizzle-kit push`: CockroachDBの `regtype` パース非互換でスキーマ取得に失敗する
- `drizzle-kit migrate`: `__drizzle_migrations` テーブルが存在せず（過去は `push` で適用）、0000から再適用しようとして失敗する

### 推奨手順

1. `drizzle-kit generate` でマイグレーションSQL生成
2. 生成されたSQLを確認・レビュー
3. `IF NOT EXISTS` / `IF EXISTS` を付けた安全なTSスクリプトを作成
4. `export $(grep -v '^#' .env | xargs) && npx tsx scripts/<script>.ts` で実行

### 参考: 0007マイグレーション適用時の実行例

```bash
export $(grep -v '^#' .env | xargs) && npx tsx scripts/apply-migration-0007.ts
```

各DDL文に `IF NOT EXISTS` / `IF EXISTS` を付けて冪等にし、FK制約は `try/catch` で既存チェック。

## 手動E2E確認

- [ ] シードデータ投入 → 商品一覧にバリエーション表示
- [ ] バリエーション選択 → カート追加 → 注文作成フロー
- [ ] 管理画面でバリエーション追加/編集/削除
- [ ] 注文キャンセル → 在庫復元確認
- [ ] LINE通知にバリエーションラベルが含まれること
