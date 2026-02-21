"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-600">
          {error.message || "エラーが発生しました"}
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-900"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
