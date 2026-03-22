"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="ja">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#dc2626",
              }}
            >
              エラーが発生しました
            </p>
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.875rem",
                color: "#4b5563",
              }}
            >
              しばらく時間をおいてから再度お試しください。
            </p>
            {error.digest && (
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                }}
              >
                エラーID: {error.digest}
              </p>
            )}
            <button
              onClick={() => reset()}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#ffffff",
                backgroundColor: "#f97316",
                border: "none",
                borderRadius: "9999px",
                cursor: "pointer",
              }}
            >
              再試行
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
