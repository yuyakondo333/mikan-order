"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-lg font-semibold text-red-600">
          エラーが発生しました
        </p>
        <p className="mt-2 text-sm text-gray-600">
          しばらく時間をおいてから再度お試しください。
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-gray-400">
            エラーID: {error.digest}
          </p>
        )}
        <button
          onClick={() => reset()}
          className="mt-4 cursor-pointer rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-900"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
