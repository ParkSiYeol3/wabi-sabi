"use server";

import { redirect } from "next/navigation";
import { recordMarketingConsent } from "@/lib/consent-record";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

// 메일의 [수신거부] 확인 버튼(#919). 로그인 없이 링크의 서명만으로 그 회원의 마케팅 수신
// 동의를 철회한다(마이페이지 토글과 같은 이력 한 줄). 서명이 틀리면 아무것도 하지 않는다.
export async function unsubscribe(formData: FormData) {
  const u = formData.get("u");
  const t = formData.get("t");
  if (!verifyUnsubscribe(u, t)) redirect("/unsubscribe?state=invalid");
  const ok = await recordMarketingConsent(u, false);
  redirect(`/unsubscribe?state=${ok ? "done" : "error"}`);
}
