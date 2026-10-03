import type { SupabaseClient } from "@supabase/supabase-js";

// 주문 메일 받는 주소(#780). 회원 주문은 계정 이메일. 비회원은 아직 주소가 없다
// (결제 화면 선택 이메일 칸은 별도 작업). 없으면 null, 보내는 쪽이 건너뛴다.
export async function orderRecipientEmail(
  admin: SupabaseClient,
  order: { user_id: string | null },
): Promise<string | null> {
  if (!order.user_id) return null;
  const { data } = await admin.auth.admin.getUserById(order.user_id);
  return data?.user?.email ?? null;
}
