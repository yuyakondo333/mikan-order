"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type Status = "loading" | "webview" | "browser";

function isWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /Line\//i.test(ua) || /FBAN|FBAV/i.test(ua) || /wv\)/.test(ua);
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-14 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function WebViewGuide() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // clipboard API非対応の場合はプロンプトで表示
      window.prompt("このURLをコピーしてください:", url);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-5 rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900">管理画面ログイン</h1>
        <div className="rounded-lg bg-amber-50 p-4">
          <p className="text-lg font-medium text-amber-800">
            LINEアプリ内ではGoogleログインが使えません
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-lg text-gray-900">
            以下の手順でログインしてください:
          </p>
          <ol className="list-inside list-decimal space-y-2 text-lg text-gray-900">
            <li>下のボタンでURLをコピー</li>
            <li>SafariまたはChromeを開く</li>
            <li>アドレスバーに貼り付けて移動</li>
          </ol>
        </div>
        <button
          onClick={handleCopy}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 text-lg font-medium text-white hover:bg-blue-700"
        >
          {copied ? "コピーしました!" : "URLをコピー"}
        </button>
      </div>
    </div>
  );
}

export function GoogleLoginButton() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    setStatus(isWebView() ? "webview" : "browser");
  }, []);

  if (status === "loading") return <Loading />;
  if (status === "webview") return <WebViewGuide />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-5 rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900">管理画面ログイン</h1>
        <button
          onClick={() => signIn("google", { callbackUrl: "/admin/orders" })}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-4 text-lg font-medium text-gray-900 hover:bg-gray-50"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Googleでログイン
        </button>
      </div>
    </div>
  );
}
