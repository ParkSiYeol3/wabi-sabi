"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { useCart } from "@/store/cart";
import { loadServerCart, mergeGuestCart } from "@/lib/cart-sync";

// 앱 진입 시 현재 세션을 읽고, 이후 인증 상태 변화를 Zustand 에 동기화.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setAdmin = useAuthStore((s) => s.setAdmin);
  // 장바구니 바인딩 상태 — 중복 병합(수량 두 배) 방지용.
  const boundUserRef = useRef<string | null>(null);

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

    // 계정 장바구니 동기화. 명시적 로그인(SIGNED_IN)에만 게스트 병합,
    // 그 외(초기 세션·토큰 갱신)는 서버 로드만 — 중복 병합 방지.
    const syncCart = async (event: string, userId: string | undefined) => {
      const cart = useCart.getState();
      if (!userId) {
        if (boundUserRef.current !== null) {
          boundUserRef.current = null;
          cart.unbindUser();
        }
        return;
      }
      if (boundUserRef.current === userId) return; // 이미 바인딩됨
      boundUserRef.current = userId;
      if (event === "SIGNED_IN") {
        const merged = await mergeGuestCart(userId, cart.items);
        cart.bindUser(userId, merged);
      } else {
        const items = await loadServerCart();
        cart.bindUser(userId, items);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      void syncAdmin(data.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      void syncAdmin(session?.user?.id);
      void syncCart(event, session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setAdmin]);

  return <>{children}</>;
}
