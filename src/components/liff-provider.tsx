"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Liff } from "@line/liff";

type LiffContextType = {
  liff: Liff | null;
  isReady: boolean;
  error: string | null;
  profile: { displayName: string; pictureUrl?: string; userId: string } | null;
};

const LiffContext = createContext<LiffContextType>({
  liff: null,
  isReady: false,
  error: null,
  profile: null,
});

export function useLiff() {
  return useContext(LiffContext);
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [liffObj, setLiffObj] = useState<Liff | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<LiffContextType["profile"]>(null);

  useEffect(() => {
    async function init() {
      try {
        const { initLiff, getLiffProfile } = await import("@/lib/liff");
        const liff = await initLiff();
        setLiffObj(liff);

        const p = await getLiffProfile();
        setProfile({
          displayName: p.displayName,
          pictureUrl: p.pictureUrl,
          userId: p.userId,
        });

        setIsReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "LIFF の初期化に失敗しました");
      }
    }
    init();
  }, []);

  return (
    <LiffContext.Provider value={{ liff: liffObj, isReady, error, profile }}>
      {children}
    </LiffContext.Provider>
  );
}
