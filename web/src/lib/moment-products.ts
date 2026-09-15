import type { SupabaseClient } from "@supabase/supabase-js";

// 오늘의 와비사비 기물 태그(#664) 공용. 한도는 DB 제약(0062 cardinality <= 5)과 같은 값.
// 클라이언트 피커도 이 상수를 쓴다 — "use client" 파일에서 export 한 값은 서버에선
// 클라이언트 참조가 되므로 상수는 여기 둔다.
export const MAX_PRODUCT_TAGS = 5;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 폼에서 온 상품 id → uuid 형식·중복 제거·고른 순서 유지·한도 자르기 후, 판매중인
// 상품만 남긴다. 클라이언트 값은 믿지 않는다(작성 액션·어드민 액션 공용).
export async function sanitizeProductIds(
  supabase: SupabaseClient,
  raw: FormDataEntryValue[],
): Promise<string[]> {
  const ids = [
    ...new Set(raw.map(String).filter((v) => UUID.test(v))),
  ].slice(0, MAX_PRODUCT_TAGS);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .in("id", ids);
  const active = new Set(((data as { id: string }[]) ?? []).map((p) => p.id));
  return ids.filter((id) => active.has(id));
}
