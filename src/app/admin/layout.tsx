"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
              setAuthenticated(true);
            } else {
              alert("パスワードが正しくありません");
            }
          }}
          className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow"
        >
          <h1 className="text-xl font-bold">管理画面ログイン</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            className="w-full rounded border p-2"
          />
          <button
            type="submit"
            className="w-full rounded bg-gray-800 py-2 text-white hover:bg-gray-900"
          >
            ログイン
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-800">管理画面</span>
          <Link
            href="/admin/orders"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            注文管理
          </Link>
          <Link
            href="/admin/products"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            商品管理
          </Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
