# Phase 2 設計: Auth.js + LIFF認証 + SCサーバーサイドデータ取得

## 技術選定

**Auth.js v5 (next-auth@beta)** + Credentials provider + JWT strategy

- LIFF IDトークンをCredentials providerで受け取り、LINE verify APIで検証
- JWT strategyでセッション管理（DB不要、ステートレス）
- セッションcookieにlineUserId/displayName/pictureUrlを含む
- SCでは `auth()` でセッション取得 → DB直接クエリ

参考: https://zenn.dev/rayven_inc_731/articles/b47dd2fcad5a91

## 認証フロー

```
[初回訪問 / セッション切れ]
  ↓
LiffProvider: liff.init() → liff.getIDToken()
  ↓
signIn('line-liff', { idToken, redirect: false })
  ↓
Auth.js Credentials authorize:
  POST https://api.line.me/oauth2/v2.1/verify
    id_token={idToken}&client_id={channelId}
  ↓
検証成功 → { id: sub, name, image } を返却
  ↓
JWT callback: token に lineUserId, displayName, pictureUrl を保存
Session callback: session.user にマッピング
  ↓
HttpOnly cookie に JWT セッション保存

[以降のリクエスト（セッション有効中）]
  ↓
SC page: auth() → session.user.lineUserId → DB直接クエリ
CC component: useSession() → session.user で表示
```

## ファイル構成（新規・変更）

### 新規ファイル

| ファイル | 役割 |
|---------|------|
| `src/auth.ts` | Auth.js設定（providers, callbacks） |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js API route handler |
| `src/lib/dal.ts` | Data Access Layer（verifySession） |
| `src/types/next-auth.d.ts` | Auth.jsの型拡張 |

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/components/liff-provider.tsx` | LIFF init後にAuth.js signIn呼び出し、profileをsessionから取得 |
| `src/app/(customer)/layout.tsx` | SessionProvider追加 |
| `src/app/(customer)/orders/page.tsx` | SCでDB直接取得、OrdersListにprops渡し |
| `src/app/(customer)/address/page.tsx` | SCでDB直接取得、AddressFormにprops渡し |
| `src/components/orders-list.tsx` | props受け取りに変更（fetchロジック削除） |
| `src/components/address-form.tsx` | props受け取りに変更（fetchロジック削除） |
| `src/components/confirm-content.tsx` | useLiff() → useSession()に変更 |
| `src/components/customer-header.tsx` | useLiff() → useSession()に変更 |
| `src/middleware.ts` | Auth.jsのルート保護追加（既存admin認証と共存） |
| `package.json` | next-auth追加 |
| `.env.local` | AUTH_SECRET追加 |

### 削除候補

| ファイル | 理由 |
|---------|------|
| `src/app/api/liff/verify/route.ts` | Auth.jsが代替（未使用だったものが正式に不要に） |
| `src/app/api/addresses/route.ts` GET | SCで直接DB取得に移行。POSTは残す |
| `src/app/api/orders/route.ts` GET(userId指定) | SCで直接DB取得に移行。管理画面用GETとPOSTは残す |

## 各ファイルの設計詳細

### 1. `src/auth.ts`

```ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

const liffProvider = Credentials({
  id: "line-liff",
  credentials: {
    idToken: { type: "text" },
  },
  async authorize(credentials) {
    // LIFF IDトークンをLINE verify APIで検証
    const channelId = process.env.NEXT_PUBLIC_LIFF_ID!.split("-")[0]
    const params = new URLSearchParams()
    params.append("id_token", credentials.idToken as string)
    params.append("client_id", channelId)

    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })

    if (!res.ok) return null

    const data = await res.json()
    return {
      id: data.sub,          // LINE userId
      name: data.name,
      image: data.picture,
    }
  },
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [liffProvider],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30日
  pages: { signIn: "/products" }, // LIFF内で自動認証するのでsignInページ不要
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.lineUserId = user.id
        token.displayName = user.name ?? ""
        token.pictureUrl = user.image
      }
      return token
    },
    async session({ session, token }) {
      session.user.lineUserId = token.lineUserId as string
      session.user.displayName = token.displayName as string
      session.user.pictureUrl = token.pictureUrl as string | undefined
      return session
    },
  },
})
```

### 2. `src/lib/dal.ts`（Data Access Layer）

```ts
import "server-only"
import { cache } from "react"
import { auth } from "@/auth"

export const verifySession = cache(async () => {
  const session = await auth()
  if (!session?.user?.lineUserId) return null
  return {
    lineUserId: session.user.lineUserId,
    displayName: session.user.displayName,
    pictureUrl: session.user.pictureUrl,
  }
})
```

**ポイント**: Next.js公式推奨のDALパターンに準拠。`cache()` でリクエスト内の重複呼び出しを防ぐ。未認証時はredirectではなくnullを返す（LIFF内で自動認証するため）。

### 3. `src/components/liff-provider.tsx`（変更）

```ts
"use client"
import { useSession, signIn } from "next-auth/react"

export function LiffProvider({ children }) {
  const { data: session, status } = useSession()
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return

    // セッションが既にあれば何もしない
    if (session) {
      setIsReady(true)
      return
    }

    // セッションがない → LIFF init → signIn
    async function init() {
      const { initLiff } = await import("@/lib/liff")
      const liff = await initLiff()
      const idToken = liff.getIDToken()
      if (idToken) {
        await signIn("line-liff", { idToken, redirect: false })
      }
    }
    init().catch((e) => setError(e.message))
  }, [session, status])

  // profile情報はsessionから取得（useLiff互換）
  const profile = session?.user ? {
    displayName: session.user.displayName,
    pictureUrl: session.user.pictureUrl,
    userId: session.user.lineUserId,
  } : null

  return (
    <LiffContext.Provider value={{ isReady, error, profile }}>
      {children}
    </LiffContext.Provider>
  )
}
```

**ポイント**: `useLiff()` のインターフェースは維持する（profile.userId等）。既存のCC（customer-header等）の変更を最小限に抑える。

### 4. `src/app/(customer)/layout.tsx`（変更）

```tsx
import { SessionProvider } from "next-auth/react"
import { LiffProvider } from "@/components/liff-provider"
import { CustomerHeader } from "@/components/customer-header"

// "use client" は削除しない（SessionProvider, LiffProviderがCCのため）
export default function CustomerLayout({ children }) {
  return (
    <SessionProvider>
      <LiffProvider>
        <CustomerHeader />
        {children}
      </LiffProvider>
    </SessionProvider>
  )
}
```

**ポイント**: `{children}` はReact Serverからの props なので、子ページがSCであることを妨げない。

### 5. `src/app/(customer)/orders/page.tsx`（変更）

```tsx
import { verifySession } from "@/lib/dal"
import { getOrdersByLineUserId } from "@/db/queries/orders"
import { OrdersList } from "@/components/orders-list"

export const metadata = { title: "注文履歴" }

export default async function OrdersPage() {
  const session = await verifySession()
  if (!session) return <OrdersList orders={[]} />

  const orders = await getOrdersByLineUserId(session.lineUserId)
  return <OrdersList orders={orders} />
}
```

### 6. `src/app/(customer)/address/page.tsx`（変更）

```tsx
import { verifySession } from "@/lib/dal"
import { getLatestAddressByLineUserId } from "@/db/queries/addresses"
import { AddressForm } from "@/components/address-form"

export const metadata = { title: "受取方法" }

export default async function AddressPage() {
  const session = await verifySession()
  const savedAddress = session
    ? await getLatestAddressByLineUserId(session.lineUserId)
    : null

  return <AddressForm savedAddress={savedAddress} />
}
```

### 7. `src/components/orders-list.tsx`（変更）

- `useLiff()` + `useEffect` + `fetch` を削除
- props で `orders: Order[]` を受け取る純粋な表示コンポーネントに変更
- `"use client"` は削除可能（状態がなくなるため）

### 8. `src/components/address-form.tsx`（変更）

- `useLiff()` + 住所fetchの `useEffect` を削除
- props で `savedAddress` を受け取る
- `"use client"` は残す（フォーム操作があるため）

### 9. `src/components/confirm-content.tsx`（変更）

- `useLiff()` → `useSession()` に変更
- `profile.userId` → `session.user.lineUserId` に変更
- API呼び出し時の `lineUserId`, `displayName`, `pictureUrl` をsessionから取得

## middleware.ts の方針

既存のadmin認証ミドルウェアと共存させる:

```ts
export { auth as middleware } from "@/auth"

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    // 顧客ルートは含めない（LIFFで自動認証するため、middlewareでブロックしない）
  ],
}
```

**判断**: 顧客ルートではmiddlewareで認証チェックしない。理由:
- LIFF内で自動的にsignInが走る
- 未認証時はデータなし表示（エラーではない）
- middlewareは「ページへのアクセスを拒否」するものだが、LIFFアプリでは全ページにアクセスできるべき

admin認証は既存のcookie検証を維持する（Auth.jsとは別管理）。

## 環境変数

```
# 追加
AUTH_SECRET=  # `npx auth secret` で生成

# 既存（変更なし）
NEXT_PUBLIC_LIFF_ID=
LINE_CHANNEL_ACCESS_TOKEN=
ADMIN_PASSWORD=
DATABASE_URL=
```

## タスク分解

### Step 1: Auth.js基盤セットアップ
- `pnpm add next-auth@beta`
- `src/auth.ts` 作成
- `src/app/api/auth/[...nextauth]/route.ts` 作成
- `src/types/next-auth.d.ts` 作成
- `.env.local` に AUTH_SECRET 追加
- 型チェック通ることを確認

### Step 2: LiffProvider + layout のAuth.js統合
- `src/app/(customer)/layout.tsx` に SessionProvider 追加
- `src/components/liff-provider.tsx` を改修（signIn統合）
- `src/lib/liff.ts` に `getIDToken` ヘルパー追加（必要に応じて）
- 動作確認: LIFF初期化 → signIn → セッションcookie生成

### Step 3: DAL + ordersページのSCデータ取得
- `src/lib/dal.ts` 作成
- `src/app/(customer)/orders/page.tsx` をSCデータ取得に変更
- `src/components/orders-list.tsx` をprops受け取りに変更

### Step 4: addressページのSCデータ取得
- `src/app/(customer)/address/page.tsx` をSCデータ取得に変更
- `src/components/address-form.tsx` のfetchロジック削除、props受け取りに変更

### Step 5: confirm-contentのuserId取得方式統一
- `src/components/confirm-content.tsx` の `useLiff()` → `useSession()` 変更
- `src/components/customer-header.tsx` の `useLiff()` → `useSession()` 変更（必要に応じて）

### Step 6: 不要コード削除 + クリーンアップ
- `src/app/api/liff/verify/route.ts` 削除
- `src/lib/liff.ts` から `getLiffAccessToken` 削除
- API route の userId クエリパラメータ対応を整理
- LiffProvider から不要な状態を削除
