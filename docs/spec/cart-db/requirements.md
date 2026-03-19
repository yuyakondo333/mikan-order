# カートDB化 要件定義

## 背景

現在カートは `localStorage` で管理されている。Phase 2（LIFF認証 → Auth.js + JWT cookieセッション移行）が完了し、サーバーサイドでユーザーを特定できるようになったため、カートをDB化してServer Componentでのデータ取得を実現する。

## 目的

1. カートデータをDBに永続化し、デバイス間で共有可能にする
2. カートページをServer Componentでサーバーサイドレンダリングする
3. カート追加時にサーバーサイドで在庫チェックを行い、整合性を保証する

## 機能要件

### FR-1: カートテーブル

- `cart_items` テーブルを新設する
- 1ユーザーにつき複数のカートアイテムを持てる（1:N）
- カラム: `id`, `user_id`, `product_id`, `quantity`, `created_at`, `updated_at`
- `user_id` + `product_id` でユニーク制約（同一商品は数量で管理）
- 価格はカートに保存しない（表示時にproductsテーブルからJOINで取得。注文確定時点の価格をorder_itemsに記録する現行方式を維持）

### FR-2: カート操作（Server Actions）

以下のServer Actionsを提供する。すべて認証必須（セッションからユーザー特定）。

| Action | 処理 |
|--------|------|
| `addToCart(productId, quantity)` | カートに商品追加。既存なら数量加算。**在庫チェック付き** |
| `updateCartItemQuantity(productId, quantity)` | 数量変更。**在庫チェック付き** |
| `removeFromCart(productId)` | カートから商品削除 |
| `clearCart()` | カート全削除（注文確定後に使用） |

### FR-3: 在庫チェック（サーバーサイド）

- カート追加・数量変更時にサーバーサイドで在庫チェックを行う
- 既存のカート内数量 + 追加数量 がproductsテーブルのstockを超えないことを検証
- `calcStockConsumption()` の既存ロジックをそのまま使用（kg/個の単位計算）
- 在庫不足時はエラーメッセージを返す

### FR-4: カートデータ取得（Server Component）

- カートページ (`/cart`) でServer Componentからカートデータを取得する
- `cart_items` と `products` をJOINし、商品名・価格・在庫を含めて取得
- 合計金額もサーバーサイドで計算

### FR-5: ヘッダーのカートバッジ

- `CustomerHeader` のカートアイテム数表示をDB連携に変更
- Server Componentでカート数を取得し、Client Componentに渡す
- リアルタイム更新: Server Actionの `revalidatePath` でカート操作後にページを再検証する

### FR-6: 認証必須化

- 顧客向けページ (`/(customer)/*`) へのアクセスに認証を必須とする
- 未認証ユーザーはLIFF認証ページにリダイレクトする
- middlewareで顧客ルートを保護する

### FR-7: カート有効期限

- カートアイテムに有効期限を設ける（作成から7日）
- 有効期限切れのアイテムは取得時に除外する
- 期限切れアイテムのクリーンアップ: 注文確定時やカート取得時に古いアイテムを削除

### FR-8: 注文確定フローの変更

- 注文確定時、カートデータをDBから取得する（クライアント送信のカートデータに依存しない）
- 注文確定後に `clearCart()` でカートをクリアする
- `confirm-content.tsx` はDBのカートデータを表示する（localStorageは使わない）

## 非機能要件

### NFR-1: パフォーマンス

- カート操作（追加/更新/削除）は1秒以内に完了する
- カートページの初期表示はSSRで高速化する

### NFR-2: データ整合性

- 在庫チェックと在庫減算は注文確定時にトランザクション内で行う（現行と同様）
- カート追加時の在庫チェックは楽観的チェック（カート内に入れても在庫は確保しない）

### NFR-3: 移行

- localStorage のカートデータは参照しなくなる（マイグレーション不要 — 認証必須化によりログイン時に空のカートから始まる）

## スコープ外

- sessionStorageの `orderFulfillment` のDB化（Phase 4で検討）
- カート内の在庫確保（在庫ロック）
- 複数配送先対応
- カートの共有機能

## 影響範囲

### 新規作成
- `src/db/schema.ts` — `cart_items` テーブル追加
- `src/app/actions/cart.ts` — カート操作Server Actions
- `src/db/queries/cart.ts` — カートDBクエリ
- DBマイグレーションファイル

### 変更
- `src/app/(customer)/cart/page.tsx` — SCでカートデータ取得
- `src/components/cart-content.tsx` — localStorage → Server Actions
- `src/components/product-list.tsx` — localStorage → Server Actions（addToCart）
- `src/components/customer-header.tsx` — localStorage → props経由でカート数取得
- `src/app/(customer)/confirm/page.tsx` — SCでカートデータ取得
- `src/components/confirm-content.tsx` — localStorage → props経由
- `src/app/api/orders/route.ts` — カートDBから取得 + clearCart
- `src/middleware.ts` — 顧客ルートの認証保護追加
- `src/types/index.ts` — CartItemType更新

### 削除（不要になるもの）
- `localStorage["cart"]` 関連のクライアントサイドロジック
- `window.dispatchEvent(new Event("cart-updated"))` のイベント同期
