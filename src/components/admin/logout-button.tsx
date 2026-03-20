"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="cursor-pointer rounded border border-red-300 px-3 py-1 text-sm text-red-600 transition-all duration-200 hover:border-red-500 hover:bg-red-600 hover:text-white"
    >
      ログアウト
    </button>
  );
}
