"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

// 회원탈퇴 (#113) — 이용약관·개인정보처리방침(#106)이 "마이페이지에서 탈퇴 가능"이라고
// 명시하는데 정작 기능이 없었다(문서가 거짓 진술).
//
// 삭제 범위(스키마 FK 기준):
//  - auth.users 삭제 → profiles cascade → addresses·wishlist·cart_items·reviews 함께 삭제
//  - orders 는 on delete set null → 주문 기록은 남고 작성자 연결만 끊김
//    (전자상거래법: 계약·결제 기록 5년 보존 — 방침에 명시한 그대로)
//  - inquiries 는 0018 로 set null 전환 → 분쟁 기록 3년 보존, 비밀글은 작성자 소실로 비공개 유지
//  - newsletter_subscribers 는 별도 동의라 자동 삭제되지 않음 → 탈퇴 시 같은 이메일 구독을
//    함께 파기한다(개인정보 파기 요구의 일부).

export type DeleteAccountState = { error: string } | null;

// 진행 중인 주문이 있으면 탈퇴를 막는다 — 계정이 사라지면 배송·환불 문의에 대응할
// 수단(주문 조회·취소)이 사라진다. 배송 완료·취소된 주문만 남았을 때 허용.
const IN_PROGRESS = ["pending", "paid", "shipping"];

export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/mypage");

  // 오조작 방지 — 정확히 "회원탈퇴" 를 입력해야 진행
  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== "회원탈퇴")
    return { error: '확인을 위해 "회원탈퇴" 를 정확히 입력해 주세요.' };

  if (!adminConfigured())
    return { error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." };

  const { data: pending, error: orderErr } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", user.id)
    .in("status", IN_PROGRESS)
    .limit(1);
  if (orderErr)
    return { error: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." };
  if (pending && pending.length > 0)
    return {
      error:
        "진행 중인 주문이 있어 탈퇴할 수 없습니다. 주문이 완료되거나 취소된 뒤에 다시 시도해 주세요.",
    };

  const admin = createAdminClient();

  // 뉴스레터 구독(별도 동의)도 함께 파기 — 탈퇴 후에도 메일을 받는 일이 없도록.
  if (user.email) {
    const { error } = await admin
      .from("newsletter_subscribers")
      .delete()
      .eq("email", user.email);
    // 실패해도 탈퇴 자체는 진행한다(계정 삭제가 본질). 흔적은 로그로 남긴다.
    if (error) console.error("[delete-account] 뉴스레터 정리 실패", error);
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("[delete-account] 계정 삭제 실패", delErr);
    return { error: "탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 서버 세션 쿠키 정리 — 계정은 이미 사라졌지만 남은 쿠키가 오작동을 만든다.
  await supabase.auth.signOut();
  redirect("/?left=1");
}
