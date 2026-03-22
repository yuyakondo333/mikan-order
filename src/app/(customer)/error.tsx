"use client";

import { useEffect } from "react";

export default function CustomerError({
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
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-4">
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
          className="mt-4 cursor-pointer rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
