import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  setAdmin: (isAdmin: boolean) => void;
  setLoading: (loading: boolean) => void;
}

// 전역 인증 상태. 실제 세션 구독은 AuthProvider 에서 supabase.auth.onAuthStateChange 로 채움.
// isAdmin 은 AuthProvider 가 profiles.role 을 읽어 채운다(헤더 어드민 링크 등 UI용).
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  loading: true,
  // 로그아웃(user=null) 시 어드민 플래그도 초기화.
  setUser: (user) =>
    set(
      user
        ? { user, loading: false }
        : { user: null, isAdmin: false, loading: false },
    ),
  setAdmin: (isAdmin) => set({ isAdmin }),
  setLoading: (loading) => set({ loading }),
}));
