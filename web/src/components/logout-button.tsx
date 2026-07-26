"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { useMounted } from "@/hooks/use-mounted";

// 로그아웃 버튼(대표님 — 눈에 띄게 빨간색). 로그인 상태에서만 렌더하므로
// 마이페이지·푸터 어디에 둬도 안전. variant 로 버튼/링크 모양 전환.
export function LogoutButton({
  variant = "button",
}: {
  variant?: "button" | "link";
}) {
  const router = useRouter();
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!mounted || !user) return null;

  if (variant === "link") {
    // 푸터(어두운 배경)용 — 밝은 빨강 글씨.
    return (
      <button
        type="button"
        onClick={logout}
        className="cursor-pointer text-[13px] text-red-400 transition-colors hover:text-red-300"
      >
        로그아웃
      </button>
    );
  }

  // 마이페이지(밝은 배경)용 — 빨간 아웃라인 버튼.
  return (
    <button
      type="button"
      onClick={logout}
      className="cursor-pointer rounded-none border border-red-500 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
    >
      로그아웃
    </button>
  );
}
