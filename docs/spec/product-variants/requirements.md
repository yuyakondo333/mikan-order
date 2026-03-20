# 商品バリエーション（重量選択）要件定義

## 背景

現在は1商品 = 1重量 × 1価格の構造。顧客は重量を選択できず、同品種で異なる重量を販売するには別商品として登録する必要がある。また、贈答用（のし付き等）と自宅用の区分もない。

## 目的

1. 1つの商品に対して複数の重量バリエーション（例: 1kg / 3kg / 5kg）を持たせ、顧客が選択購入できるようにする
2. 贈答用 / 自宅用の区分をバリエーション単位で管理する
3. 管理画面からバリエーションを自由に追加・編集・削除できるようにする

## 機能要件

### FR-1: product_variants テーブル

- `product_variants` テーブルを新設する
- `products` テーブルとの関係: 1商品 → N バリエーション
- カラム:

| カラム | 型 | 説明 |
|--------|------|------|
| `id` | uuid | 主キー |
| `product_id` | uuid (FK → products, ON DELETE CASCADE) | 商品への参照 |
| `label` | text | 表示ラベル（例: "3kg", "5kg 贈答用"） |
| `weight_kg` | numeric(10,3) | 重量（kg単位、小数対応。例: 0.5, 1, 3, 5） |
| `price_jpy` | integer | 価格（円） |
| `is_gift_only` | boolean | 贈答用限定フラグ（デフォルト false） |
| `display_order` | integer | 表示順 |
| `is_available` | boolean | 販売可否（デフォルト true） |
| `created_at` | timestamp | 作成日時 |
| `updated_at` | timestamp | 更新日時 |

- バリエーションには在庫を持たない（在庫は商品単位で共有管理）

### FR-2: products テーブルの変更

- 以下のカラムを `products` から **削除** する:
  - `variety` — `name` に統一（例: name="早生みかん"）
  - `weight_grams` → `product_variants.weight_kg` に移行
  - `price_jpy` → `product_variants.price_jpy` に移行
  - `stock_unit` — 廃止。在庫は常にkg単位の numeric で管理する
- 以下のカラムを `products` に **変更して残す**:
  - `stock` → `stock_kg: numeric(10,3)` — 在庫をkg単位で管理（例: 50kg = 50.000）
- 以下のカラムは `products` に **そのまま残す**:
  - `id`, `name`, `description`, `image_url`, `is_available`
  - `created_at`, `updated_at`
- `products.is_available = false` の場合、全バリエーションが非表示になる（親での一括制御）

### FR-3: 在庫管理（商品単位で共有、kg管理）

- 在庫は `products.stock_kg`（numeric(10,3)）で商品単位に管理する
- PostgreSQL の `numeric` 型は正確な十進演算のため、丸め誤差は発生しない
- 注文時の在庫消費: `variant.weight_kg × quantity` を `products.stock_kg` から引く
  - 例: 3kgバリエーションを2個注文 → 6kg 消費
  - 例: 0.5kgバリエーションを3個注文 → 1.5kg 消費
- バリエーション間で在庫を共有する（3kg用/5kg用で分けない）
- 在庫チェック（カート追加時）: `variant.weight_kg × quantity <= products.stock_kg` で個別判定
- 在庫チェック（注文時）: 同一商品のカート内全バリエーションの合計消費kgで判定（2段構え）
- 売り切れ判定: その商品の全バリエーション（`is_available = true`）について `weight_kg > products.stock_kg` なら商品自体が売り切れ

### FR-4: cart_items の変更

- 現在の参照先を `product_id` → `variant_id` に変更する
  - FK制約: `ON DELETE CASCADE`（バリエーション削除時にカートから自動削除）
- `product_id` も冗長カラムとして残す（同一商品の合計在庫チェックを効率化するため）
- ユニーク制約: `(user_id, variant_id)` の組み合わせで1件
- `quantity` はそのまま維持

### FR-5: order_items の変更

- `product_id` → `variant_id` に変更する
  - FK制約: `ON DELETE SET NULL`（バリエーション削除後もスナップショットで表示可能）
- `product_id` も残す（ON DELETE SET NULL。キャンセル時の在庫復元先特定用）
- 以下のスナップショットカラムを追加（注文時点の値を記録）:
  - `product_name: text` — 商品名
  - `label: text` — バリエーションラベル
  - `weight_kg: numeric(10,3)` — 重量
- `unit_price_jpy` はそのまま維持（注文時点の価格スナップショット）
- キャンセル時の在庫復元は `order_items.weight_kg × quantity` kgを `product_id` の商品に加算する（マスタではなくスナップショットを使用。product_id が NULL の場合は復元スキップ）

### FR-6: 顧客向け商品画面

- 商品一覧: 商品単位で表示（バリエーションの最低価格を「○○円〜」で表示）
- 商品詳細/選択: バリエーション一覧を表示し、顧客が1つ選択してカートに追加
  - 各バリエーションに価格・在庫状況（購入可能か）を表示
  - 在庫不足のバリエーションは選択不可（`weight_kg > products.stock_kg` の場合）
  - 贈答用バリエーション（`is_gift_only = true`）には目印を表示
- 現在の ProductCard 内の数量セレクタ → バリエーション選択 + 数量セレクタに変更
- UIフロー（カード内 / モーダル / 詳細ページ）は設計フェーズで決定する

### FR-7: カート画面

- カートアイテムに商品名 + バリエーションラベルを表示
- 数量変更・削除は現行通り（参照先がvariantに変わるだけ）

### FR-8: 注文フロー

- 在庫チェック（2段構え）:
  1. カート追加時: 個別バリエーション単位でチェック（`weight_kg × quantity <= stock_kg`）
  2. 注文確定時: 同一商品のカート内全バリエーションの合計消費kgで再チェック
- 在庫減算: 注文確定時にアトミックに `stock_kg` から減算
- 注文確認画面に商品名 + バリエーションラベルを表示
- 注文履歴にもバリエーション情報を表示（`order_items` のスナップショットから）

### FR-9: 管理画面 - 商品管理

- 商品の作成/編集フォームにバリエーション管理セクションを追加
- バリエーションの追加・編集・削除が可能
- 各バリエーションの重量・価格・贈答用フラグ・販売可否を個別に設定可能
- 在庫は商品単位でkg入力・保存
- 商品には最低1つのバリエーションが必要（バリデーション）

### FR-10: 管理画面 - 注文管理

- 注文詳細にバリエーション情報（ラベル・重量）を表示
- `order_items` のスナップショットから表示（マスタ削除後も正確に表示可能）

## 非機能要件

### NFR-1: データ移行

- 既存のシードデータは削除し、新構造で再作成する
- マイグレーションで `product_variants` テーブルを作成し、`products` テーブルから不要カラムを削除

### NFR-2: 在庫整合性

- 在庫チェック・減算のアトミック性は現行と同等以上を維持する
- 同一商品の複数バリエーションが同時に注文された場合、合計消費kgで在庫チェックする
- キャンセル時の在庫復元: `order_items.weight_kg × quantity` グラムを `products.stock_kg` に加算（スナップショットベース）
- 在庫は `numeric(10,3)` で管理。PostgreSQL の numeric 型は正確な十進演算のため丸め誤差なし

### NFR-3: 後方互換性

- LINE通知等、外部連携で商品情報を送信している箇所はバリエーション情報を含めるよう更新する

## スコープ外

- バリエーションの種類を重量以外（色、サイズ等）に拡張すること（将来対応）
- 複数バリエーションの組み合わせ購入の割引（セット割）
- 贈答用の「のし」設定の詳細（住所・名入れ等）
- UIフローの詳細（設計フェーズで決定）
