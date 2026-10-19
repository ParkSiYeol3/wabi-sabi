import { passwordPolicyError } from "@/lib/auth-input";
import { cn } from "@/lib/utils";

// 새 비밀번호 칸 아래 실시간 확인(시열님) — 맞으면 초록, 틀리면 빨강.

const RULE = "8자 이상, 영문과 숫자를 포함해 주세요.";

// 조건 — 비어 있으면 안내만, 치기 시작하면 맞음/틀림.
export function PasswordRuleHint({ id, value }: { id?: string; value: string }) {
  const error = value ? passwordPolicyError(value) : null;
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn(
        "mt-1 font-numeric text-xs",
        !value ? "text-wabi-fg-muted" : error ? "text-red-700" : "text-green-700",
      )}
    >
      {!value ? RULE : (error ?? "사용할 수 있는 비밀번호입니다.")}
    </p>
  );
}

// 확인 칸 — 치기 시작하면 위 칸과 같은지.
export function PasswordMatchHint({
  password,
  confirm,
}: {
  password: string;
  confirm: string;
}) {
  if (!confirm) return null;
  const same = password === confirm;
  return (
    <p
      aria-live="polite"
      className={cn("mt-1 font-numeric text-xs", same ? "text-green-700" : "text-red-700")}
    >
      {same ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
    </p>
  );
}
