"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setNickname, type NicknameResult } from "@/app/account-actions";

// 닉네임 설정 모달(개인정보보호 — 대표님/시열님). 소셜/이메일 가입 직후 실명이 그대로
// 노출되지 않도록, nickname_set=false 인 사용자에게 한 번 별명을 정하게 한다. 저장 전엔
// 닫을 수 없다(별명 확정이 목적). layout 에 마운트돼 로그인 상태를 감시.
export function NicknameGate() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  // null=미확인, true=설정 필요, false=면제/완료.
  const [needed, setNeeded] = useState<boolean | null>(null);

  const [state, action, pending] = useActionState<NicknameResult | null, FormData>(
    async (prev, formData) => {
      const result = await setNickname(prev, formData);
      if (result.ok) setNeeded(false);
      return result;
    },
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const decide = async () => {
      if (
        !user ||
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        if (!cancelled) setNeeded(false);
        return;
      }
      const { data } = await createClient()
        .from("profiles")
        .select("nickname_set")
        .eq("id", user.id)
        .maybeSingle<{ nickname_set: boolean }>();
      if (!cancelled) setNeeded(data ? data.nickname_set === false : false);
    };
    void decide();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 로그인 화면에선 띄우지 않는다(가입 흐름과 겹치지 않게).
  if (needed !== true || pathname === "/auth") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nickname-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm border border-wabi-border bg-wabi-bg p-6 shadow-lg">
        <h2 id="nickname-title" className="text-lg font-medium text-wabi-fg">
          닉네임을 정해주세요
        </h2>
        <p className="mt-2 text-sm leading-6 text-wabi-fg-muted">
          커뮤니티·리뷰에 표시될 별명이에요. 실명 대신 편하게 쓸 이름을
          정해주세요.
        </p>

        <form action={action} className="mt-5 space-y-3">
          <Input
            name="nickname"
            autoFocus
            required
            minLength={2}
            maxLength={20}
            placeholder="사용할 닉네임 (2~20자)"
            aria-label="닉네임"
            className="rounded-none"
          />
          {state && !state.ok && (
            <p role="alert" className="text-sm text-red-700">
              {state.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-none bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
          >
            {pending ? "저장 중…" : "시작하기"}
          </Button>
        </form>
      </div>
    </div>
  );
}
