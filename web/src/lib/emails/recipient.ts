import type { SupabaseClient } from "@supabase/supabase-js";

// 주문 메일 받는 주소(#780·#787). 회원 주문은 계정 이메일, 비회원은 결제 때 선택으로
// 남긴 이메일(guest_email). 없으면 null, 보내는 쪽이 건너뛴다.
export async function orderRecipientEmail(
  admin: SupabaseClient,
  order: { user_id: string | null; guest_email?: string | null },
): Promise<string | null> {
  if (!order.user_id) return order.guest_email ?? null;
  const { data } = await admin.auth.admin.getUserById(order.user_id);
  return data?.user?.email ?? null;
}
