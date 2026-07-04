"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";

// 앱 진입 시 현재 세션을 읽고, 이후 인증 상태 변화를 Zustand 에 동기화.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setAdmin = useAuthStore((s) => s.setAdmin);

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

    // 로그인 사용자의 role 조회 → 어드민 플래그(헤더 링크 등 UI용). RLS: 본인 profile 만.
    const syncAdmin = async (userId: string | undefined) => {
      if (!userId) {
        setAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      setAdmin(data?.role === "admin");
    };

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      void syncAdmin(data.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void syncAdmin(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setAdmin]);

  return <>{children}</>;
}
