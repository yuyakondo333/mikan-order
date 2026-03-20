"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/app/actions/admin";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await loginAdmin(password);

      if (result.success) {
        router.push("/admin/orders");
      } else {
        setError(result.error || "ログインに失敗しました");
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow"
      >
        <h1 className="text-xl font-bold">管理画面ログイン</h1>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          className="w-full rounded border p-2"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-gray-800 py-2 text-white hover:bg-gray-900 disabled:opacity-50"
        >
          {isPending ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
