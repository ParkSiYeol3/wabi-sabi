"use client";

import { useState } from "react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "login" | "signup";

// TODO(WSB-001/003): Supabase auth(signInWithPassword/signUp) 연동. 현재는 UI 골격.
export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");

  return (
    <Container className="flex justify-center py-20">
      <div className="w-full max-w-sm border border-wabi-border p-8">
        {/* 탭 */}
        <div className="grid grid-cols-2 border-b border-wabi-border">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
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
          onSubmit={(e) => e.preventDefault()}
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
              className="rounded-none"
            />
          </Field>
          <Field label="비밀번호" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              required
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
                className="rounded-none"
              />
            </Field>
          )}

          <Button
            type="submit"
            className="w-full rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
          >
            {tab === "login" ? "로그인" : "회원가입"}
          </Button>
        </form>
      </div>
    </Container>
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
