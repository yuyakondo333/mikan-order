# Phase 2: LIFF認証cookie化 + SCサーバーサイドデータ取得

## 背景

Phase 1で全page.tsxをServer Component化したが、orders/addressのデータ取得はCCコンポーネント（OrdersList, AddressForm）内の `useEffect` + `fetch` で行われている。

現状の問題:
1. **認証なし**: userId をクエリパラメータで直接送信しており、LIFF access tokenの検証がない
2. **CCでのデータ取得**: SCページなのにCC子コンポーネントがfetchでデータ取得 → ウォーターフォール発生
3. **未使用コード**: `/api/liff/verify` と `getLiffAccessToken()` が実装済みだが未使用

## 目的

LIFF access tokenをcookieに保存し、サーバーサイドでtoken検証 + userId特定を行うことで:
- SCページでDBから直接データ取得可能にする
- 認証の仕組みを導入する（なりすまし防止）

## 要件

### R1: LIFF token → cookie保存
- LIFF初期化後、access tokenをHTTPOnly cookieに保存する
- cookieの設定: `httpOnly: true`, `secure: true`(本番), `sameSite: lax`, 適切なmaxAge
- ブラウザから直接cookieにアクセスできないようにする（XSS対策）

### R2: サーバーサイドでのtoken検証 + userId特定
- cookieからaccess tokenを取得し、LINE verify APIで検証する
- 検証成功時、LIFFプロフィールAPIからuserIdを特定する
- 検証結果をキャッシュしてLINE APIへの過剰なリクエストを防ぐ

### R3: ordersページのSCデータ取得
- `orders/page.tsx` でcookieからuserId特定 → DB直接クエリ
- `OrdersList` は表示専用CCに変更（データをpropsで受け取る）
- `/api/orders` GETのuserId指定は管理画面のみ使用

### R4: addressページのSCデータ取得
- `address/page.tsx` でcookieからuserId特定 → DB直接クエリ
- `AddressForm` は保存済み住所をpropsで受け取る
- `/api/addresses` GETのuserId指定は不要化を検討

### R5: 未認証時のハンドリング
- cookieがない/無効な場合、LIFF未ログイン状態として扱う
- 顧客ページで未認証の場合の表示（ローディングorエラー）を定義する

### R6: confirm-contentのuserIdもcookieベースに移行
- 注文作成時もcookieからuserIdを取得する方式に統一

## スコープ外
- カートのDB化（Phase 3）
- sessionStorageのfulfillment情報のサーバーサイド化
- 管理画面の認証変更（既にcookieベース）

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `src/components/liff-provider.tsx` | token取得 → API経由でcookie設定 |
| `src/lib/liff.ts` | token関連ヘルパー追加 |
| `src/app/api/liff/verify/route.ts` | cookie設定を追加（またはセッション確立API新設） |
| `src/middleware.ts` | 顧客ルートでのcookie検証追加 |
| `src/app/(customer)/orders/page.tsx` | SCでDB直接取得 |
| `src/app/(customer)/address/page.tsx` | SCでDB直接取得 |
| `src/components/orders-list.tsx` | props受け取りに変更 |
| `src/components/address-form.tsx` | props受け取りに変更 |
| `src/components/confirm-content.tsx` | userId取得方式変更 |
