"use client";

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-4">
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-600">
          {error.message || "エラーが発生しました"}
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
