import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  // 표시용 아바타 — profiles.avatar_url(고정값). 세션 메타(provider별로 바뀜) 대신
  // 이걸 헤더에서 쓴다. AuthProvider 가 profiles 에서 role 과 함께 읽어 채운다.
  avatarUrl: string | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setAdmin: (isAdmin: boolean) => void;
  setAvatarUrl: (url: string | null) => void;
  setLoading: (loading: boolean) => void;
}

// 전역 인증 상태. 실제 세션 구독은 AuthProvider 에서 supabase.auth.onAuthStateChange 로 채움.
// isAdmin·avatarUrl 은 AuthProvider 가 profiles(role·avatar_url)를 읽어 채운다(UI용).
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  avatarUrl: null,
  loading: true,
  // 로그아웃(user=null) 시 어드민 플래그·아바타도 초기화.
  setUser: (user) =>
    set(
      user
        ? { user, loading: false }
        : { user: null, isAdmin: false, avatarUrl: null, loading: false },
    ),
  setAdmin: (isAdmin) => set({ isAdmin }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  setLoading: (loading) => set({ loading }),
}));
