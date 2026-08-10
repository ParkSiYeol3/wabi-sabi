"use server";

import { z } from "zod";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

// 비회원 주문조회 (94단계 후속) — 게스트는 계정이 없어 마이페이지 주문내역을 볼 수
// 없으므로, 주문번호+전화번호 2요소로 본인 주문을 조회한다. 회원 주문(user_id 있음)은
// 여기서 조회되지 않는다(마이페이지 전용) — user_id IS NULL 로 게스트 주문에 한정.
const schema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9-]{9,13}$/, "전화번호 형식이 올바르지 않습니다."),
});

export type GuestOrderItem = {
  product_name: string;
  quantity: number;
  price: number;
  addons: { code: string; name: string; price: number }[] | null;
};
export type GuestOrder = {
  order_number: string;
  status: string;
  total_price: number;
  shipping_fee: number;
  recipient: string;
  address: string;
  ordered_at: string;
  delivered_at: string | null;
  delivery_memo: string | null;
  tracking_number: string | null;
  order_items: GuestOrderItem[];
};
export type LookupResult =
  | { ok: true; order: GuestOrder }
  | { ok: false; error: string };

const THROTTLE_WINDOW_MS = 10 * 60 * 1000; // 10분
const THROTTLE_MAX = 20; // 10분당 20회 초과 차단

export async function lookupGuestOrder(input: {
  orderNumber: string;
  phone: string;
}): Promise<LookupResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "주문번호와 전화번호를 정확히 입력해 주세요." };
  if (!adminConfigured())
    return { ok: false, error: "조회를 위한 서버 설정이 없습니다." };
  const admin = createAdminClient();
  const { orderNumber, phone } = parsed.data;

  // 브루트포스 방지 — 전화번호 기준 최근 10분 시도 횟수 제한(0044 스로틀 로그).
  // 주문번호는 시간기반이라 다소 추측 가능하므로 조회 남용을 막는다.
  const windowStart = new Date(Date.now() - THROTTLE_WINDOW_MS).toISOString();
  const { count } = await admin
    .from("guest_lookup_throttle")
    .select("id", { count: "exact", head: true })
    .eq("throttle_key", phone)
    .gte("attempted_at", windowStart);
  if ((count ?? 0) >= THROTTLE_MAX)
    return {
      ok: false,
      error: "조회 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    };
  await admin.from("guest_lookup_throttle").insert({ throttle_key: phone });

  // 게스트 주문(user_id null)에서 주문번호·전화번호가 모두 일치하는 1건.
  // 어느 필드가 틀렸는지 알려주지 않는다(열거 공격 방지) — 항상 동일한 실패 메시지.
  const { data: order } = await admin
    .from("orders")
    .select(
      "order_number, status, total_price, shipping_fee, recipient, address, ordered_at, delivered_at, delivery_memo, tracking_number, order_items(product_name, quantity, price, addons)",
    )
    .eq("order_number", orderNumber)
    .eq("phone", phone)
    .is("user_id", null)
    .maybeSingle<GuestOrder>();

  if (!order)
    return {
      ok: false,
      error: "일치하는 주문이 없습니다. 주문번호와 전화번호를 확인해 주세요.",
    };
  return { ok: true, order };
}
