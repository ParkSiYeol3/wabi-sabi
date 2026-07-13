"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { headers } from "next/headers";

// 뉴스레터 구독 (#108) — 이전엔 폼이 action 없이 아무 동작도 안 했다.
// 이메일 = 개인정보 → 개인정보처리방침(#106) 동의 없이는 거절하고, 동의 시각을 남긴다.
// 쓰기는 service_role — 구독자 테이블은 이메일 집합이라 공개 클라이언트에 노출 금지(0017).

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  // 체크된 체크박스만 "on" 으로 전송된다 — 미동의는 빈 문자열이라 여기서 걸린다.
  consent: z.literal("on", { message: "개인정보 수집·이용 동의가 필요합니다." }),
});

export type NewsletterState = { ok: boolean; message: string } | null;

export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({
    email: String(formData.get("email") || ""),
    consent: formData.get("consent") ?? "",
  });
  if (!parsed.success) {
    const consentIssue = parsed.error.issues.find((i) =>
      i.path.includes("consent"),
    );
    return {
      ok: false,
      message: consentIssue
        ? "개인정보 수집·이용에 동의해 주세요."
        : "이메일 주소를 확인해 주세요.",
    };
  }
  const { email } = parsed.data;

  // 무인증 쓰기 경로 — IP 당 시간 5건. 이메일 주소 대량 등록(목록 오염) 차단.
  const ip = clientIpFromHeaders(await headers());
  const { ok } = await rateLimit(`newsletter:${ip}`, 5, 3_600);
  if (!ok)
    return { ok: false, message: "요청이 잦습니다. 잠시 후 다시 시도해 주세요." };

  if (!adminConfigured())
    return { ok: false, message: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." };

  // 로그인 상태면 연결(비로그인 구독도 허용)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const admin = createAdminClient();
    // 재구독·중복 제출 모두 멱등 — unique(email) 충돌 시 동의 시각만 갱신하고
    // 구독 취소 상태를 해제한다.
    const { error } = await admin.from("newsletter_subscribers").upsert(
      {
        email,
        user_id: user?.id ?? null,
        consented_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: "email" },
    );
    if (error) throw error;
  } catch (err) {
    console.error("[newsletter] 구독 저장 실패", err);
    return { ok: false, message: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." };
  }

  return { ok: true, message: "구독이 완료되었습니다. 소식을 보내드릴게요." };
}
