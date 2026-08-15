"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { CONSENT_VERSIONS } from "@/lib/consent";
import { loginAction } from "./actions";
import { cn } from "@/lib/utils";

type Tab = "login" | "signup";

// WSB-001/003: 이메일 회원가입·로그인 (Supabase Auth).
function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  // open redirect 방지 — 내부 경로("/...")만 허용, "//host" 형태도 차단.
  const rawRedirect = params.get("redirect") || "/";
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  // 이미 로그인 상태면 로그인 폼 대신 목적지로 이동 (예: 장바구니→주문하기).
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  useEffect(() => {
    if (!authLoading && user) router.replace(redirect);
  }, [authLoading, user, redirect, router]);

  // 세션 만료로 튕겨온 경우 사유 안내(SessionTimeout — 미활동 30분·절대 7일).
  const timedOut = params.get("reason") === "timeout";
  const timeoutKind = params.get("kind");

  // ?tab=signup 이면 회원가입 탭으로 시작(푸터 회원가입 링크 등).
  const [tab, setTab] = useState<Tab>(
    params.get("tab") === "signup" ? "signup" : "login",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // 회원가입 약관 동의 — 이용약관·개인정보(필수), 마케팅(선택). 동의 항목·버전은
  // signUp 메타데이터로 넘겨 트리거가 user_consents 에 이력으로 남긴다(개인정보보호법).
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  async function onOAuth(provider: "kakao" | "google") {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) setError(error.message);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const supabase = createClient();

    // 명백한 플레이스홀더/예약 도메인(test.com·example.*·.test 등)은 실사용
    // 이메일이 아니므로 가입·로그인 모두 즉시 차단(대표님 — test@test.com 같은
    // 가짜 차단). 근본 유효성은 Supabase '이메일 확인'(+Resend SMTP)이 담당한다.
    if (isPlaceholderEmail(email)) {
      setError(
        "사용할 수 없는 이메일입니다. 실제 사용하는 이메일 주소를 입력해 주세요.",
      );
      return;
    }

    setLoading(true);
    try {
      if (tab === "login") {
        // 서버 액션으로 프록시 — 연속 실패 제한(무차별 대입 방어)을 서버에서 강제.
        const res = await loginAction(email, password);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(redirect);
        router.refresh();
      } else {
        const name = String(form.get("name") || "").trim();
        const password2 = String(form.get("password2") || "");
        if (password !== password2) {
          setError("비밀번호가 일치하지 않습니다.");
          return;
        }
        // 비밀번호 정책(보안_체크리스트 P1) — 8자 이상 + 영문·숫자 포함.
        // 서버 강제는 Supabase 대시보드 Password Requirements 로 동일 기준 설정(👤).
        if (password.length < 8) {
          setError("비밀번호는 8자 이상이어야 합니다.");
          return;
        }
        if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
          setError("비밀번호는 영문과 숫자를 모두 포함해야 합니다.");
          return;
        }
        // 필수 동의(이용약관·개인정보) 미체크면 가입 차단.
        if (!agreeTerms || !agreePrivacy) {
          setError("이용약관과 개인정보 수집·이용에 동의해 주세요.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              // 동의 이력 — 트리거(handle_new_user)가 user_consents 에 항목별 기록.
              consent_terms_version: CONSENT_VERSIONS.terms,
              consent_privacy_version: CONSENT_VERSIONS.privacy,
              consent_marketing: agreeMarketing,
            },
            // 이메일 확인이 켜진 경우, 확인 링크가 우리 콜백으로 돌아와 세션을
            // 교환하고 원래 목적지로 이동하게 한다.
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          },
        });
        if (error) throw error;
        // 이메일 확인이 켜진 경우 session 이 null
        if (!data.session) {
          setNotice("확인 메일을 보냈습니다. 메일의 링크로 인증을 완료해 주세요.");
          setTab("login");
        } else {
          router.push(redirect);
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm border border-wabi-border p-8">
      {/* 시각적으론 탭이 제목 역할 — 스크린리더용 페이지 제목만 별도 제공 */}
      <h1 className="sr-only">로그인 · 회원가입</h1>
      {timedOut && (
        <p
          role="status"
          className="mb-6 border border-wabi-border bg-wabi-subtle/40 px-4 py-3 font-numeric text-sm leading-6 text-wabi-fg-muted"
        >
          {timeoutKind === "max"
            ? "보안을 위해 로그인 후 7일이 지나 자동 로그아웃되었습니다. 다시 로그인해 주세요."
            : "30분간 활동이 없어 자동 로그아웃되었습니다. 다시 로그인해 주세요."}
        </p>
      )}
      <div className="grid grid-cols-2 border-b border-wabi-border">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setError(null);
              setNotice(null);
            }}
            className={cn(
              "pb-3 text-sm transition-colors",
              tab === t
                ? "border-b-2 border-wabi-fg font-medium text-wabi-fg"
                : "text-wabi-fg-muted",
            )}
          >
            {t === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={onSubmit}
        aria-label={tab === "login" ? "로그인" : "회원가입"}
      >
        {tab === "signup" && (
          <Field label="이름" htmlFor="name">
            <Input id="name" name="name" required className="rounded-none" />
          </Field>
        )}
        <Field label="이메일" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-none font-numeric"
          />
        </Field>
        <Field label="비밀번호" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            className="rounded-none font-numeric"
            aria-describedby={tab === "signup" ? "password-hint" : undefined}
          />
          {tab === "signup" && (
            <p id="password-hint" className="mt-1 font-numeric text-xs text-wabi-fg-muted">
              8자 이상, 영문과 숫자를 포함해 주세요.
            </p>
          )}
        </Field>
        {tab === "signup" && (
          <Field label="비밀번호 확인" htmlFor="password2">
            <Input
              id="password2"
              name="password2"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-none font-numeric"
            />
          </Field>
        )}

        {tab === "signup" && (
          <div className="space-y-2 pt-1">
            <ConsentCheck checked={agreeTerms} onChange={setAgreeTerms}>
              <Link
                href="/legal/terms"
                target="_blank"
                className="underline underline-offset-2 hover:text-wabi-fg"
              >
                이용약관
              </Link>
              에 동의합니다 <span className="text-red-700">(필수)</span>
            </ConsentCheck>
            <ConsentCheck checked={agreePrivacy} onChange={setAgreePrivacy}>
              <Link
                href="/legal/privacy"
                target="_blank"
                className="underline underline-offset-2 hover:text-wabi-fg"
              >
                개인정보 수집·이용
              </Link>
              에 동의합니다 <span className="text-red-700">(필수)</span>
            </ConsentCheck>
            <ConsentCheck checked={agreeMarketing} onChange={setAgreeMarketing}>
              마케팅 정보 수신에 동의합니다{" "}
              <span className="text-wabi-fg-muted">(선택)</span>
            </ConsentCheck>
          </div>
        )}

        {error && (
          <p className="font-numeric text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="font-numeric text-xs text-wabi-fg" role="status">
            {notice}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
        >
          {loading ? "처리 중…" : tab === "login" ? "로그인" : "회원가입"}
        </Button>
      </form>

      {/* 소셜 로그인 (WSB-002) */}
      <div className="mt-8">
        <div className="flex items-center gap-3 text-xs text-wabi-fg-muted">
          <span className="h-px flex-1 bg-wabi-border" />
          또는
          <span className="h-px flex-1 bg-wabi-border" />
        </div>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => onOAuth("kakao")}
            className="flex min-h-11 w-full items-center justify-center gap-2 bg-[#FEE500] text-sm font-medium text-[#191600] transition-opacity hover:opacity-90"
          >
            <KakaoLogo />
            카카오로 계속하기
          </button>
          <button
            type="button"
            onClick={() => onOAuth("google")}
            className="flex min-h-11 w-full items-center justify-center gap-2 border border-wabi-border text-sm font-medium transition-colors hover:bg-wabi-muted"
          >
            <GoogleLogo />
            Google로 계속하기
          </button>
        </div>
        {/* 소셜 로그인은 별도 체크박스 대신 고지 — 계속 진행 시 필수 약관에 동의한 것으로
            보고, 첫 가입이면 콜백에서 동의 이력을 남긴다(개인정보보호법). */}
        <p className="mt-4 text-center text-xs leading-5 text-wabi-fg-muted">
          소셜 계정으로 계속하면{" "}
          <Link
            href="/legal/terms"
            target="_blank"
            className="underline underline-offset-2 hover:text-wabi-fg"
          >
            이용약관
          </Link>
          과{" "}
          <Link
            href="/legal/privacy"
            target="_blank"
            className="underline underline-offset-2 hover:text-wabi-fg"
          >
            개인정보 수집·이용
          </Link>
          에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}

// 명백한 플레이스홀더/예약 도메인 — 실사용 이메일이 아니므로 가입·로그인 차단.
// RFC 2606 예약 도메인/TLD(example.*·.test·.invalid·.localhost) + test.com.
// (근본적인 유효성 확인은 Supabase '이메일 확인'(+Resend SMTP)이 담당한다.)
function isPlaceholderEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return false;
  const blocked = new Set([
    "test.com",
    "example.com",
    "example.net",
    "example.org",
  ]);
  const blockedTld = [".test", ".invalid", ".example", ".localhost"];
  return blocked.has(domain) || blockedTld.some((t) => domain.endsWith(t));
}

// 소셜 브랜드 로고 — 인라인 SVG(self-host, CSP·외부요청 없음). 각 브랜드 가이드라인
// 색을 그대로 쓴다(카카오 심볼=검정 말풍선, 구글=4색 G).
function KakaoLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 3C6.477 3 2 6.463 2 10.735c0 2.764 1.874 5.185 4.69 6.56-.153.53-.983 3.41-1.015 3.638 0 0-.02.17.09.235.11.065.239.014.239.014.318-.044 3.68-2.404 4.26-2.81.554.078 1.124.118 1.706.118 5.523 0 10-3.463 10-7.735S17.523 3 12 3z"
      />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// 약관 동의 체크박스 한 줄 — 라벨 안에 약관 링크를 넣기 위해 label 로 감싼다.
function ConsentCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-wabi-fg-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-wabi-accent"
      />
      <span>{children}</span>
    </label>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs text-wabi-fg-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Container className="flex justify-center py-20">
      <Suspense fallback={null}>
        <AuthForm />
      </Suspense>
    </Container>
  );
}
