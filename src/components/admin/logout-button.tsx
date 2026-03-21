"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function LogoutButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="cursor-pointer rounded border border-red-300 px-5 py-2.5 text-base font-medium text-red-600 transition-all duration-200 hover:border-red-500 hover:bg-red-600 hover:text-white"
      >
        ログアウト
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-6 text-center text-xl font-bold text-gray-900">
              ログアウトしますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 cursor-pointer rounded border border-gray-300 px-4 py-3.5 text-lg font-medium text-gray-900 transition-colors hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="flex-1 cursor-pointer rounded bg-red-600 px-4 py-3.5 text-lg font-medium text-white transition-colors hover:bg-red-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
