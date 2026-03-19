"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type LiffContextType = {
  isReady: boolean;
  error: string | null;
  profile: { displayName: string; pictureUrl?: string; userId: string } | null;
};

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  error: null,
  profile: null,
});

export function useLiff() {
  return useContext(LiffContext);
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    // セッションが既にあれば何もしない
    if (session) {
      setIsReady(true);
      return;
    }

    // セッションがない → LIFF init → signIn
    async function init() {
      try {
        const { initLiff } = await import("@/lib/liff");
        const liff = await initLiff();
        const idToken = liff.getIDToken();

        if (!idToken) {
          setError("LINEログインが必要です");
          return;
        }

        const result = await signIn("line-liff", {
          idToken,
          redirect: false,
        });

        if (result?.error) {
          setError("認証に失敗しました");
          return;
        }

        // signIn成功 → SCを再レンダリングさせる
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "LIFF の初期化に失敗しました"
        );
      }
    }
    init();
  }, [session, status, router]);

  // profile情報はsessionから取得（useLiff互換）
  const profile = session?.user
    ? {
        displayName: session.user.displayName,
        pictureUrl: session.user.pictureUrl,
        userId: session.user.lineUserId,
      }
    : null;

  return (
    <LiffContext.Provider value={{ isReady, error, profile }}>
      {children}
    </LiffContext.Provider>
  );
}
