import { createClient } from "@/lib/supabase/server";
import {
  couponLabel,
  COUPONS_ENABLED,
  effectiveExpiry,
  lastUsableIso,
  type Coupon,
} from "@/lib/coupons";

type WalletRow = { expires_at: string | null; coupons: Coupon | null };

// 지금 쓸 수 있는 쿠폰만. 발급 후 N일(0068) 기한을 쿠폰 만료로 합쳐 두면 화면에
// 보이는 날짜와 실제 사용 판정이 같은 값을 본다. 기한이 지난 건 아예 내리지 않는다.
// (렌더 중 Date.now() 를 부르면 리렌더마다 결과가 달라지므로 바깥에 둔다.)
function usableNow(rows: WalletRow[]): Coupon[] {
  const now = Date.now();
  return rows
    .map((r) =>
      r.coupons
        ? {
            ...r.coupons,
            expires_at: effectiveExpiry(r.coupons.expires_at, r.expires_at),
          }
        : null,
    )
    .filter((c): c is Coupon => !!c && c.is_active)
    .filter((c) => !c.expires_at || new Date(c.expires_at).getTime() >= now);
}

// 마이페이지 '내 쿠폰'(0059) — 지갑의 미사용 쿠폰. RLS 로 본인 것만 조회된다.
// 자체완결 서버 컴포넌트(마이페이지 데이터 흐름과 분리).
export async function MyCoupons() {
  if (!COUPONS_ENABLED) return null; // 준비 상태 — 손님에게 미노출
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_coupons")
    .select("used_at, expires_at, coupons(*)")
    .eq("user_id", user.id)
    .is("used_at", null)
    .order("issued_at", { ascending: false });

  const coupons = usableNow(
    (data ?? []) as unknown as WalletRow[],
  );

  return (
    <section className="mt-14">
      <h2 className="text-lg font-medium">내 쿠폰</h2>
      {coupons.length === 0 ? (
        <p className="mt-4 text-sm text-wabi-fg-muted">
          사용 가능한 쿠폰이 없습니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {coupons.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 border border-wabi-border p-4 text-sm"
            >
              <span className="min-w-0">
                <span className="font-medium text-wabi-fg">
                  {couponLabel(c)}
                </span>
                {c.description ? (
                  <span className="text-wabi-fg-muted"> · {c.description}</span>
                ) : null}
                {c.min_order > 0 ? (
                  <span className="block text-xs text-wabi-fg-muted">
                    {c.min_order.toLocaleString("ko-KR")}원 이상 주문 시 사용 가능
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-wabi-fg-muted">
                {c.expires_at
                  ? `~ ${new Date(lastUsableIso(c.expires_at)).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`
                  : "무기한"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
