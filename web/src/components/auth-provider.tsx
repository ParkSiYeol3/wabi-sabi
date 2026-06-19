"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";

// 앱 진입 시 현재 세션을 읽고, 이후 인증 상태 변화를 Zustand 에 동기화.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // Supabase 미설정이면 스킵 (셋업 전 dev 동작 보장)
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setUser(null);
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return <>{children}</>;
}
