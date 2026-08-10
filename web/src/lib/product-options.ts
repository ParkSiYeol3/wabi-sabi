// 상품 커스텀 옵션(색상·모양 등) — 선택만(가격·재고 영향 없음, 대표님). 상품마다
// 선택지가 달라 미리 정의 못 하므로 대표님이 등록 시 직접 정의하고, 손님이 상세에서
// 고른다. 고른 값은 주문에 스냅샷돼 대표님이 어떤 걸 보낼지 안다.
//
//   products.options    = OptionGroup[]     대표님이 정의한 옵션 그룹
//   cart/order.options  = SelectedOption[]  손님이 고른 선택(라인/주문 스냅샷)

// soldOut = 품절로 표시할 선택지(수동 토글, 대표님). values 의 부분집합. 손님은 못 고름.
export type OptionGroup = { name: string; values: string[]; soldOut?: string[] };
export type SelectedOption = { name: string; value: string };

const MAX_GROUPS = 8;
const MAX_VALUES = 24;
const NAME_MAX = 40;
const VALUE_MAX = 60;

function str(o: unknown, key: string): string {
  return o && typeof o === "object"
    ? String((o as Record<string, unknown>)[key] ?? "").trim()
    : "";
}

// 옵션 그룹 파싱(어드민 저장·조회 공용) — 임의 jsonb 를 안전한 형태로 정규화한다.
// 이름/값 트림, 빈 값·중복 제거, 개수·길이 상한. 값이 하나도 없는 그룹은 버린다.
export function parseOptionGroups(raw: unknown): OptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const out: OptionGroup[] = [];
  for (const g of raw) {
    const name = str(g, "name").slice(0, NAME_MAX);
    const valuesRaw = (g as Record<string, unknown> | null)?.["values"];
    if (!name || !Array.isArray(valuesRaw)) continue;
    const seen = new Set<string>();
    const values: string[] = [];
    for (const v of valuesRaw) {
      const val = String(v ?? "").trim().slice(0, VALUE_MAX);
      if (!val || seen.has(val)) continue;
      seen.add(val);
      values.push(val);
      if (values.length >= MAX_VALUES) break;
    }
    if (values.length === 0) continue;
    // 품절 표시된 선택지 — 실제 존재하는 값만, 중복 제거. 비면 필드 생략.
    const soldRaw = (g as Record<string, unknown> | null)?.["soldOut"];
    const soldOut = Array.isArray(soldRaw)
      ? [
          ...new Set(
            soldRaw
              .map((s) => String(s ?? "").trim())
              .filter((s) => values.includes(s)),
          ),
        ]
      : [];
    out.push(soldOut.length ? { name, values, soldOut } : { name, values });
    if (out.length >= MAX_GROUPS) break;
  }
  return out;
}

// 선택 옵션 파싱(장바구니·주문 스냅샷 표시용) — 정규화만(값 검증은 아래 validate).
export function parseSelectedOptions(raw: unknown): SelectedOption[] {
  if (!Array.isArray(raw)) return [];
  const out: SelectedOption[] = [];
  for (const s of raw) {
    const name = str(s, "name").slice(0, NAME_MAX);
    const value = str(s, "value").slice(0, VALUE_MAX);
    if (!name || !value) continue;
    out.push({ name, value });
    if (out.length >= MAX_GROUPS) break;
  }
  return out;
}

// 손님 선택 검증(서버 — 결제 시). 상품 그룹마다 정확히 하나의 정의된 값이 선택돼야
// 하고, 정의에 없는 값/그룹은 버린다. 누락 시 ok:false — 대표님이 색상 모르는 주문 방지.
export function validateSelection(
  groups: OptionGroup[],
  selected: SelectedOption[],
): { ok: true; options: SelectedOption[] } | { ok: false; missing: string } {
  const pick = new Map(selected.map((s) => [s.name, s.value]));
  const options: SelectedOption[] = [];
  for (const g of groups) {
    const chosen = pick.get(g.name);
    // 정의된 값이어야 하고, 품절 표시된 선택지는 거부(UI 에서도 비활성이지만 서버가 최종 판정).
    if (
      !chosen ||
      !g.values.includes(chosen) ||
      (g.soldOut ?? []).includes(chosen)
    )
      return { ok: false, missing: g.name };
    options.push({ name: g.name, value: chosen });
  }
  return { ok: true, options };
}
