"use client";

import { useActionState, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  deleteAccount,
  type DeleteAccountState,
} from "@/app/mypage/delete-account-actions";

// 회원탈퇴 (#113) — 되돌릴 수 없으므로 ① 섹션을 접어두고 ② "회원탈퇴" 타이핑을
// 요구한다. 남는 데이터(주문·문의)는 법정 보존 의무라 미리 알린다.
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccount,
    null,
  );
  const done = !!state && "ok" in state;
  const error = state && "error" in state ? state.error : null;

  // 탈퇴 완료 — 브라우저 세션까지 지우고 문서를 새로 연다(#725). 페이지 이동만 하면
  // 메모리에 남은 로그인 상태(헤더·스토어) 때문에 탈퇴 뒤에도 로그인으로 보였다.
  useEffect(() => {
    if (!done) return;
    (async () => {
      try {
        await createClient().auth.signOut({ scope: "local" });
      } catch {
        // 세션이 이미 없어도 아래 새로 열기로 상태가 비워진다.
      }
      window.location.replace("/");
    })();
  }, [done]);

  return (
    <section className="mt-16 border-t border-wabi-border pt-8">
      <h2 className="text-base font-medium">회원 탈퇴</h2>

      {!open ? (
        <>
          <p className="mt-2 text-sm text-wabi-fg-muted">
            탈퇴하면 계정과 배송지, 위시리스트, 장바구니, 리뷰가 삭제되며 되돌릴
            수 없습니다.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            className="mt-4 rounded-none border-red-600 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            회원 탈퇴
          </Button>
        </>
      ) : (
        <form action={action} className="mt-4 max-w-md">
          <div className="border border-red-200 bg-red-50/50 p-4 text-sm">
            <p className="font-medium text-red-700">
              탈퇴하면 되돌릴 수 없습니다.
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-wabi-fg-muted">
              <li>계정, 배송지, 위시리스트, 장바구니, 리뷰가 삭제됩니다.</li>
              <li>
                주문 내역과 문의 글은 법령에 따라 보관되며(전자상거래법), 작성자
                정보만 삭제되어 조회할 수 없게 됩니다.
              </li>
              <li>진행 중인 주문이 있으면 탈퇴할 수 없습니다.</li>
            </ul>
          </div>

          <label
            htmlFor="confirm"
            className="mt-4 block text-sm text-wabi-fg-muted"
          >
            확인을 위해 <strong className="text-wabi-fg">회원탈퇴</strong> 를
            입력해 주세요.
          </label>
          <Input
            id="confirm"
            name="confirm"
            required
            autoComplete="off"
            disabled={pending}
            placeholder="회원탈퇴"
            className="mt-2 rounded-none"
          />

          {error && (
            <p role="alert" className="mt-3 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              type="submit"
              disabled={pending || done}
              className="rounded-none bg-red-600 hover:bg-red-700"
            >
              {pending || done ? "처리 중…" : "탈퇴하기"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="rounded-none"
            >
              취소
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
