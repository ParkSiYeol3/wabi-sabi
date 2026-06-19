"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Tab = "login" | "signup";

// WSB-001/003: 이메일 회원가입·로그인 (Supabase Auth).
function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const supabase = createClient();

    setLoading(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      } else {
        const name = String(form.get("name") || "").trim();
        const password2 = String(form.get("password2") || "");
        if (password !== password2) {
          setError("비밀번호가 일치하지 않습니다.");
          return;
        }
        if (password.length < 6) {
          setError("비밀번호는 6자 이상이어야 합니다.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
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
      <div className="grid grid-cols-2 border-b border-wabi-border">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            type="button"
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
            className="rounded-none"
          />
        </Field>
        <Field label="비밀번호" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            className="rounded-none"
          />
        </Field>
        {tab === "signup" && (
          <Field label="비밀번호 확인" htmlFor="password2">
            <Input
              id="password2"
              name="password2"
              type="password"
              required
              autoComplete="new-password"
              className="rounded-none"
            />
          </Field>
        )}

        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-xs text-wabi-fg" role="status">
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
    </div>
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
